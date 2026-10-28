'use client';

import { useCallback, useEffect, useState } from 'react';

type SessionInfo = { authenticated: boolean };
type Guild = { id: string; name: string };

function timeLabel(date: Date | null) {
  if (!date) return 'Checking…';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export default function DashboardLiveStatus() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [guildCount, setGuildCount] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = (await sessionResponse.json()) as SessionInfo;
      setAuthenticated(session.authenticated);
      if (session.authenticated) {
        const guildResponse = await fetch('/api/discord/guilds', { cache: 'no-store' });
        const data = (await guildResponse.json()) as { guilds?: Guild[]; error?: string };
        if (!guildResponse.ok) throw new Error(data.error || 'Could not refresh your Discord servers.');
        setGuildCount(data.guilds?.length ?? 0);
        setError('');
      } else {
        setGuildCount(null);
        setError('');
      }
      setUpdatedAt(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Live status could not be refreshed.');
      setUpdatedAt(new Date());
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return (
    <section className="live-status" aria-live="polite">
      <div className="live-status-heading">
        <span className={authenticated ? 'live-indicator connected' : 'live-indicator'} />
        <div>
          <strong>{authenticated === null ? 'Connecting dashboard…' : authenticated ? 'Discord connection active' : 'Discord connection not signed in'}</strong>
          <p>{authenticated ? `Managed servers: ${guildCount === null ? 'checking…' : guildCount}` : 'Sign in with Discord to load servers you can manage.'}</p>
        </div>
      </div>
      <div className="live-status-meta">
        <span>{error ? 'Refresh issue' : 'Auto-refresh: 30 seconds'}</span>
        <span>{timeLabel(updatedAt)}</span>
      </div>
      {error && <p className="live-status-error">{error}</p>}
    </section>
  );
}
