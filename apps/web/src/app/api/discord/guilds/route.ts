import { NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';

export const runtime = 'nodejs';

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

export async function GET() {
  const session = await getDiscordSession();
  if (!session) return NextResponse.json({ error: 'Sign in with Discord first.' }, { status: 401 });

  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ error: 'Could not load your Discord servers.' }, { status: 502 });
    const guilds = (await response.json()) as DiscordGuild[];
    const manageable = guilds
      .filter((guild) => {
        const permissions = BigInt(guild.permissions);
        return guild.owner || (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
      })
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64` : null,
        owner: guild.owner,
      }));
    return NextResponse.json({ guilds: manageable });
  } catch {
    return NextResponse.json({ error: 'Could not load Discord servers right now.' }, { status: 500 });
  }
}
