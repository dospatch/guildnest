import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { STATE_COOKIE } from '@/lib/discord-session';

export const runtime = 'nodejs';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Discord OAuth is not configured. Add DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI in the deployment environment.' },
      { status: 503 },
    );
  }

  const state = randomBytes(24).toString('hex');
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
