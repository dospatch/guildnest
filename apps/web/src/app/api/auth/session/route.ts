import { NextResponse } from 'next/server';
import { getDiscordSession } from '@/lib/discord-session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getDiscordSession();
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.global_name || session.user.username,
      avatarUrl: session.user.avatar
        ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png?size=64`
        : null,
    },
  });
}
