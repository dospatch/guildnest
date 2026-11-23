'use client';

import { useEffect, useState } from 'react';
import DiscordLogin from '../components/discord-login';
import DashboardLiveStatus from '../components/dashboard-live-status';

const modules = [
  { id: 'server-overview', icon: '⌘', name: 'Server overview', description: 'View the Discord servers your account can manage.', status: 'Live', tone: 'ready' },
  { id: 'tickets-support', icon: '◷', name: 'Tickets & support', description: 'Open private tickets, claim requests, and close or reopen conversations.', status: 'Live', tone: 'ready' },
  { id: 'community-center', icon: '◇', name: 'Community Center', description: 'Collect bug reports, suggestions, and feedback, with suggestion voting.', status: 'Live', tone: 'ready' },
  { id: 'server-setup', icon: '▤', name: 'Server setup & sync', description: 'Create the starter layout and safely restore missing GuildNest items.', status: 'Live', tone: 'ready' },
  { id: 'moderation', icon: '⚑', name: 'Moderation', description: 'Moderation workflows and staff tools are being developed.', status: 'Planned', tone: 'planned' },
  { id: 'applications', icon: '▣', name: 'Applications', description: 'Application forms, reviews, and staff recruitment workflows.', status: 'Planned', tone: 'planned' },
  { id: 'activity-logs', icon: '↗', name: 'Activity & logs', description: 'A central view of important server and staff activity.', status: 'Planned', tone: 'planned' },
];

export default function DashboardPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        if (!active) return;
        if (data.authenticated) setAuthorized(true);
        else window.location.replace('/?discord_error=session_missing');
      })
      .catch(() => { if (active) window.location.replace('/'); });
    return () => { active = false; };
  }, []);

  if (!authorized) {
    return (
      <main className="dashboard-auth-check">
        <div className="brand-mark">G<span>N</span></div>
        <strong>Checking your Discord sign-in…</strong>
        <p>GuildNest will open your modules after your account is verified.</p>
      </main>
    );
  }

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <main className="shell">
      {mobileNavOpen && <button className="mobile-nav-overlay" aria-label="Close navigation menu" onClick={closeMobileNav} />}
      <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
        <a className="brand" href="#modules" aria-label="GuildNest modules" onClick={closeMobileNav}>
          <span className="brand-mark">G<span>N</span></span>
          <span className="brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#modules" onClick={closeMobileNav}><span>◇</span> Modules <span className="nav-count">{modules.length}</span></a>
        </nav>
        <div className="sidebar-module-heading">YOUR MODULES</div>
        <nav className="sidebar-module-list" aria-label="GuildNest modules">
          {modules.map((module) => (
            <a className="sidebar-module-item" href={`#module-${module.id}`} key={module.id} onClick={closeMobileNav}>
              <span className="sidebar-module-icon">{module.icon}</span>
              <span>{module.name}</span>
              <span className={`sidebar-module-status ${module.tone}`} />
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="nestmate-card">
            <div className="nestmate-icon">N</div>
            <div><strong>NestMate</strong><small>Discord companion</small></div>
            <span className="status-dot" aria-label="Bot service status shown in Render" />
            <p>Your Discord companion for GuildNest modules and server tools.</p>
          </div>
          <a className="github-link" href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer"><span>↗</span> View project on GitHub</a>
          <div className="sidebar-foot">GuildNest modules, all in one place.</div>
        </div>
      </aside>

      <section className="main-area" id="modules">
        <header className="topbar">
          <button className="mobile-menu-toggle" aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Modules</strong></div>
          <div className="topbar-right"><span className="environment"><i /> GUILDNEST</span><DiscordLogin /></div>
        </header>

        <div className="content modules-only-content">
          <div className="modules-page-heading">
            <div className="eyebrow"><span className="eyebrow-line" /> GUILDNEST TOOLKIT</div>
            <h1>Your community.<br className="mobile-break" /> <em>Your modules.</em></h1>
            <p className="welcome-copy">Choose a module to see what's available now and what's coming next.</p>
          </div>

          <DashboardLiveStatus />

          <div className="section-heading modules-section-heading">
            <div><div className="section-kicker">MODULE LIBRARY</div><h2>All modules</h2></div>
            <span className="section-meta">{modules.length} MODULES</span>
          </div>
          <div className="module-grid">
            {modules.map((module) => (
              <article className="module-card" id={`module-${module.id}`} key={module.id}>
                <div className="module-top"><span className="module-icon">{module.icon}</span><span className={`pill ${module.tone}`}>{module.status}</span></div>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <div className="card-foot"><span>GUILDNEST MODULE</span><span className="arrow">↗</span></div>
              </article>
            ))}
          </div>
          <footer className="footer"><span>© 2026 GuildNest</span><span>New modules arrive through verified releases.</span><a href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer">Open source workspace ↗</a></footer>
        </div>
      </section>
    </main>
  );
}
