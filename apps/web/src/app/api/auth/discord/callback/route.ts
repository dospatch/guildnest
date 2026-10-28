import { NextRequest, NextResponse } from 'next/server';
import { encryptSession, SESSION_COOKIE, STATE_COOKIE, type DiscordUser } from '@/lib/discord-session';

export const runtime = 'nodejs';

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });

  if (!clientId || !clientSecret || !redirectUri) {
    return fail('Discord OAuth is not fully configured. Check the Vercel environment variables.', 503);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    const response = fail('Discord sign-in could not be verified. Please try again.');
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    });
    if (!tokenResponse.ok) {
      return fail('Discord could not complete sign-in. Check the OAuth redirect URL and try again.', 502);
    }
    const token = (await tokenResponse.json()) as TokenResponse;
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) return fail('Discord did not return your account details.', 502);

    const user = (await userResponse.json()) as DiscordUser;
    const session = encryptSession({
      user,
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    });
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(60, Math.min(token.expires_in, 60 * 60 * 24 * 7)),
    });
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    return fail('An unexpected sign-in error occurred. Please try again.', 500);
  }
}
