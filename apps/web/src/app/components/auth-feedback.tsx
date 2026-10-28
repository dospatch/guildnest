'use client';

import { useEffect, useState } from 'react';

const messages: Record<string, string> = {
  cancelled: 'Discord sign-in was cancelled. You can try again whenever you are ready.',
  invalid_state: 'The sign-in check expired or could not be verified. Start again using Continue with Discord.',
  not_configured: 'GuildNest is missing an OAuth environment setting in Vercel. Check DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, and SESSION_SECRET.',
  token_exchange_failed: 'Discord authorization returned, but GuildNest could not exchange the sign-in code. Check that the Discord OAuth redirect URL exactly matches the Vercel setting.',
  profile_failed: 'Discord authorized the app, but GuildNest could not load your profile. Please try again.',
  callback_failed: 'GuildNest hit an error while finishing sign-in. Please try again.',
  session_missing: 'Discord returned to GuildNest, but the dashboard could not read your sign-in session. Check that the production domain and Vercel SESSION_SECRET are consistent, then try signing in again.',
};

export default function AuthFeedback() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('discord_error');
    if (reason) setMessage(messages[reason] || 'Discord sign-in did not finish. Please try again.');
  }, []);

  if (!message) return null;
  return (
    <div className="landing-auth-feedback" role="alert">
      <span aria-hidden="true">!</span>
      <p>{message}</p>
      <button type="button" onClick={() => { window.location.href = '/api/auth/discord'; }}>Try again</button>
    </div>
  );
}
