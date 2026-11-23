import { NextRequest, NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';
import { getDatabasePool } from '@/lib/db';

export const runtime = 'nodejs';

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

function canManageGuild(guild: DiscordGuild) {
  const permissions = BigInt(guild.permissions);
  return guild.owner || (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
}

async function syncUser(pool: ReturnType<typeof getDatabasePool>, session: NonNullable<Awaited<ReturnType<typeof getDiscordSession>>>) {
  await pool.query(
    `INSERT INTO guildnest.users
      (discord_user_id, username, global_name, avatar_hash, last_seen_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (discord_user_id) DO UPDATE SET
       username = EXCLUDED.username,
       global_name = EXCLUDED.global_name,
       avatar_hash = EXCLUDED.avatar_hash,
       updated_at = now(),
       last_seen_at = now()`,
    [session.user.id, session.user.username, session.user.global_name ?? null, session.user.avatar ?? null],
  );
}

export async function GET() {
  const session = await getDiscordSession();
  if (!session) return NextResponse.json({ error: 'Sign in with Discord first.' }, { status: 401 });

  try {
    const pool = getDatabasePool();
    await syncUser(pool, session);
    const result = await pool.query(
      `SELECT w.id, w.name, w.slug, m.role,
              dc.discord_guild_id, dc.guild_name, dc.guild_icon_hash, dc.status AS connection_status,
              s.plan, s.status AS subscription_status
       FROM guildnest.workspace_members m
       JOIN guildnest.workspaces w ON w.id = m.workspace_id
       LEFT JOIN guildnest.discord_connections dc ON dc.workspace_id = w.id
       LEFT JOIN guildnest.subscriptions s ON s.workspace_id = w.id
       WHERE m.discord_user_id = $1
       ORDER BY w.created_at DESC`,
      [session.user.id],
    );
    return NextResponse.json({ workspaces: result.rows });
  } catch (error) {
    console.error('GuildNest workspace lookup failed:', error);
    return NextResponse.json({ error: 'Workspace data is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getDiscordSession();
  if (!session) return NextResponse.json({ error: 'Sign in with Discord first.' }, { status: 401 });

  let body: { guildId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 });
  }

  const guildId = typeof body.guildId === 'string' ? body.guildId : '';
  if (!/^\d{15,22}$/.test(guildId)) {
    return NextResponse.json({ error: 'Choose a valid Discord server.' }, { status: 400 });
  }

  try {
    const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!discordResponse.ok) {
      return NextResponse.json({ error: 'Discord could not verify your server access. Please sign in again.' }, { status: 502 });
    }

    const guilds = (await discordResponse.json()) as DiscordGuild[];
    const guild = guilds.find((item) => item.id === guildId);
    if (!guild || !canManageGuild(guild)) {
      return NextResponse.json({ error: 'You need Manage Server or Administrator permission for this server.' }, { status: 403 });
    }

    const pool = getDatabasePool();
    await syncUser(pool, session);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const slug = `server-${guild.id}`;
      await client.query(
        `INSERT INTO guildnest.workspaces (name, slug, owner_discord_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [guild.name, slug, session.user.id],
      );

      const workspaceResult = await client.query(
        `SELECT id, name, slug, owner_discord_user_id
         FROM guildnest.workspaces WHERE slug = $1 FOR UPDATE`,
        [slug],
      );
      const workspace = workspaceResult.rows[0];
      if (!workspace || workspace.owner_discord_user_id !== session.user.id) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'This server is already connected to a different GuildNest workspace.' }, { status: 409 });
      }

      await client.query(
        `INSERT INTO guildnest.workspace_members (workspace_id, discord_user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (workspace_id, discord_user_id) DO UPDATE SET role = 'owner'`,
        [workspace.id, session.user.id],
      );

      const connectionResult = await client.query(
        `INSERT INTO guildnest.discord_connections
          (workspace_id, discord_guild_id, guild_name, guild_icon_hash, connected_by_discord_user_id, status)
         VALUES ($1, $2, $3, $4, $5, 'connected')
         ON CONFLICT (discord_guild_id) DO UPDATE SET
           guild_name = EXCLUDED.guild_name,
           guild_icon_hash = EXCLUDED.guild_icon_hash,
           status = 'connected',
           updated_at = now()
         WHERE guildnest.discord_connections.workspace_id = EXCLUDED.workspace_id
         RETURNING id`,
        [workspace.id, guild.id, guild.name, guild.icon, session.user.id],
      );
      if (connectionResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'This Discord server is already connected to another workspace.' }, { status: 409 });
      }

      await client.query(
        `INSERT INTO guildnest.subscriptions (workspace_id, plan, status)
         VALUES ($1, 'free', 'active')
         ON CONFLICT (workspace_id) DO NOTHING`,
        [workspace.id],
      );
      await client.query(
        `INSERT INTO guildnest.workspace_modules (workspace_id, module_key, enabled)
         SELECT $1, module_key, is_core FROM guildnest.modules WHERE is_active = true
         ON CONFLICT (workspace_id, module_key) DO NOTHING`,
        [workspace.id],
      );
      await client.query(
        `INSERT INTO guildnest.audit_logs (workspace_id, actor_discord_user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'workspace.discord_server_connected', 'discord_guild', $3, $4::jsonb)`,
        [workspace.id, session.user.id, guild.id, JSON.stringify({ guildName: guild.name })],
      );

      await client.query('COMMIT');
      return NextResponse.json({
        workspace: { id: workspace.id, name: guild.name, slug: workspace.slug, guildId: guild.id },
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('GuildNest workspace connection failed:', error);
    return NextResponse.json({ error: 'Could not connect this Discord server right now.' }, { status: 503 });
  }
}
