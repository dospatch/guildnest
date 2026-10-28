'use client';

import { useEffect, useState } from 'react';

type SessionInfo = {
  authenticated: boolean;
  user?: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

type Guild = { id: string; name: string; iconUrl: string | null; owner: boolean };

export default function DiscordLogin() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: SessionInfo) => {
        if (active) setSession(data);
      })
      .catch(() => {
        if (active) setSession({ authenticated: false });
      });
    return () => { active = false; };
  }, []);

  async function loadGuilds() {
    setMessage('');
    try {
      const response = await fetch('/api/discord/guilds', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Unable to load servers.');
        return;
      }
      setGuilds(data.guilds as Guild[]);
      if (!data.guilds?.length) setMessage('No servers with Manage Server or Administrator permission were found.');
    } catch {
      setMessage('Could not contact GuildNest. Please try again.');
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession({ authenticated: false });
    setGuilds(null);
    setMessage('');
  }

  if (session === null) return <div className="auth-actions"><span className="auth-loading">Checking Discord…</span></div>;

  if (!session.authenticated) {
    return (
      <div className="auth-actions">
        <a className="discord-login" href="/api/auth/discord"><span aria-hidden="true">◈</span> Login with Discord</a>
      </div>
    );
  }

  const user = session.user!;
  return (
    <div className="auth-area">
      <div className="signed-in-user">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="avatar-fallback">D</span>}
        <span>{user.displayName}</span>
      </div>
      <button className="discord-login secondary" onClick={loadGuilds}>My servers</button>
      <button className="sign-out" onClick={signOut}>Sign out</button>
      {guilds && <div className="guild-popover">
        <strong>Servers you can manage</strong>
        {guilds.map((guild) => <div className="guild-option" key={guild.id}>
          {guild.iconUrl ? <img src={guild.iconUrl} alt="" /> : <span className="guild-fallback">#</span>}
          <span>{guild.name}</span>
          {guild.owner && <small>OWNER</small>}
        </div>)}
        {message && <p>{message}</p>}
      </div>}
      {!guilds && message && <span className="auth-message">{message}</span>}
    </div>
  );
}
