'use client';

import { useCallback, useEffect, useState } from 'react';

type SessionInfo = { authenticated: boolean };
type Guild = { id: string; name: string; iconUrl?: string | null; owner?: boolean };

function timeLabel(date: Date | null) {
  if (!date) return 'Checking…';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export default function DashboardLiveStatus() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!sessionResponse.ok) throw new Error('Could not verify your Discord session.');
      const session = (await sessionResponse.json()) as SessionInfo;
      setAuthenticated(session.authenticated);
      if (session.authenticated) {
        const guildResponse = await fetch('/api/discord/guilds', { cache: 'no-store' });
        const data = (await guildResponse.json()) as { guilds?: Guild[]; error?: string };
        if (!guildResponse.ok) throw new Error(data.error || 'Could not refresh your Discord servers.');
        setGuilds(data.guilds ?? []);
        setError('');
      } else {
        setGuilds([]);
        setError('');
      }
      setUpdatedAt(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Live status could not be refreshed.');
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
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
      <div className="live-status-main">
        <div className="live-status-heading">
          <span className={authenticated ? 'live-indicator connected' : 'live-indicator'} />
          <div>
            <strong>{authenticated === null ? 'Connecting dashboard…' : authenticated ? 'Discord connection active' : 'Discord connection not signed in'}</strong>
            <p>{authenticated ? `Manageable Discord servers: ${guilds.length}` : 'Sign in with Discord to load servers you can manage.'}</p>
          </div>
        </div>
        {authenticated && guilds.length > 0 && (
          <div className="live-guild-list" aria-label="Manageable Discord servers">
            {guilds.map((guild) => (
              <div className="live-guild" key={guild.id}>
                {guild.iconUrl ? (
                  // Discord's guild icon URL is returned by our authenticated server endpoint.
                  <img src={guild.iconUrl} alt="" />
                ) : (
                  <span className="live-guild-fallback" aria-hidden="true">{guild.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="live-guild-name" title={guild.name}>{guild.name}</span>
                {guild.owner && <small>OWNER</small>}
              </div>
            ))}
          </div>
        )}
        {authenticated && guilds.length === 0 && !loading && !error && (
          <p className="live-guild-empty">No servers with management access were found for this Discord account.</p>
        )}
      </div>
      <div className="live-status-side">
        <div className="live-status-meta">
          <span>{error ? 'Refresh issue' : 'Auto-refresh: 30 seconds'}</span>
          <span>Updated {timeLabel(updatedAt)}</span>
        </div>
        <button className="live-status-refresh" type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh servers'}
        </button>
      </div>
      {error && <p className="live-status-error">{error}</p>}
    </section>
  );
}
