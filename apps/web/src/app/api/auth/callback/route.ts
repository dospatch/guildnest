import { NextRequest, NextResponse } from 'next/server';
import { encryptSession, SESSION_COOKIE, STATE_COOKIE, type DiscordUser } from '@/lib/discord-session';

export const runtime = 'nodejs';

function returnToHome(request: NextRequest, error?: string) {
  const url = new URL('/', request.url);
  if (error) url.searchParams.set('discord_error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (params.has('error')) return returnToHome(request, 'cancelled');
  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return returnToHome(request, 'invalid_state');
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!clientId || !clientSecret || !redirectUri || !sessionSecret || sessionSecret.length < 32) {
    return returnToHome(request, 'not_configured');
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
      // Log only Discord's non-secret error fields and HTTP status; never log the code, token, or client secret.
      const errorData = (await tokenResponse.json().catch(() => ({}))) as {
        error?: string;
        error_description?: string;
      };
      console.error('[GuildNest OAuth] Discord token exchange rejected the request', {
        status: tokenResponse.status,
        error: errorData.error ?? 'unknown_error',
        errorDescription: errorData.error_description ?? 'No description returned',
        redirectUriConfigured: redirectUri,
      });
      return returnToHome(request, 'token_exchange_failed');
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; token_type?: string };
    if (!tokenData.access_token || !tokenData.expires_in) {
      console.error('[GuildNest OAuth] Discord token response did not include required fields', {
        hasAccessToken: Boolean(tokenData.access_token),
        hasExpiresIn: Boolean(tokenData.expires_in),
      });
      return returnToHome(request, 'token_exchange_failed');
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) return returnToHome(request, 'profile_failed');
    const user = (await userResponse.json()) as DiscordUser;
    if (!user.id || !user.username) return returnToHome(request, 'profile_failed');

    const sessionValue = encryptSession({
      user,
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(60, Math.min(tokenData.expires_in, 60 * 60 * 24 * 7)),
    });
    response.cookies.set(STATE_COOKIE, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch {
    return returnToHome(request, 'callback_failed');
  }
}
