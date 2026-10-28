'use client';

import { useEffect, useState } from 'react';
import DiscordLogin from '../components/discord-login';
import DashboardLiveStatus from '../components/dashboard-live-status';

const modules = [
  { id: 'server-overview', icon: '⌘', name: 'Server overview', description: 'A home for your community settings.', status: 'Foundation', tone: 'ready' },
  { id: 'tickets-support', icon: '◷', name: 'Tickets & support', description: 'Organize member questions and staff replies.', status: 'Planned', tone: 'planned' },
  { id: 'applications', icon: '◇', name: 'Applications', description: 'Collect and review staff or department applications.', status: 'Planned', tone: 'planned' },
  { id: 'moderation', icon: '⚑', name: 'Moderation', description: 'Build consistent, accountable moderation tools.', status: 'Planned', tone: 'planned' },
  { id: 'server-setup', icon: '▤', name: 'Server setup', description: 'A guided checklist for roles, channels, and permissions.', status: 'In progress', tone: 'progress' },
  { id: 'activity-logs', icon: '↗', name: 'Activity & logs', description: 'Make important community actions easier to track.', status: 'Planned', tone: 'planned' },
];

const commands = [
  { command: '/help', detail: 'Show NestMate help and available commands.' },
  { command: '/module', detail: 'View the GuildNest module roadmap.' },
  { command: '/setup', detail: 'Open the server setup checklist.' },
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
        if (data.authenticated) {
          setAuthorized(true);
        } else {
          window.location.replace('/?discord_error=session_missing');
        }
      })
      .catch(() => {
        if (active) window.location.replace('/');
      });
    return () => { active = false; };
  }, []);

  if (!authorized) {
    return (
      <main className="dashboard-auth-check">
        <div className="brand-mark">G<span>N</span></div>
        <strong>Checking your Discord sign-in…</strong>
        <p>GuildNest will open your dashboard after your account is verified.</p>
      </main>
    );
  }

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <main className="shell">
      {mobileNavOpen && <button className="mobile-nav-overlay" aria-label="Close navigation menu" onClick={closeMobileNav} />}
      <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
        <a className="brand" href="#home" aria-label="GuildNest home" onClick={closeMobileNav}>
          <span className="brand-mark">G<span>N</span></span>
          <span className="brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#home" onClick={closeMobileNav}><span>▦</span> Overview</a>
          <a className="nav-item" href="#modules" onClick={closeMobileNav}><span>◇</span> Modules <span className="nav-count">6</span></a>
          <a className="nav-item" href="#commands" onClick={closeMobileNav}><span>⌘</span> Bot commands</a>
          <a className="nav-item" href="#roadmap" onClick={closeMobileNav}><span>↗</span> Roadmap</a>
        </nav>
        <div className="sidebar-module-heading">MODULES</div>
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
            <span className="status-dot" aria-label="Setup pending" />
            <p>Connect and launch the bot from your secure environment to bring your server tools online.</p>
          </div>
          <a className="github-link" href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer"><span>↗</span> View project on GitHub</a>
          <div className="sidebar-foot">Built for communities, one module at a time.</div>
        </div>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar">
          <button className="mobile-menu-toggle" aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right"><span className="environment"><i /> GUILDNEST</span><DiscordLogin /></div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR COMMUNITY, IN GOOD HANDS</div>
              <h1>Build a better<br className="mobile-break" /> <em>community.</em></h1>
              <p className="welcome-copy">One calm, organized place to manage your Discord server. Start with the essentials and add the tools your community needs.</p>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-glyph">G<span>N</span></div><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span></div>
          </div>

          <div className="notice"><span className="notice-icon">i</span><div><strong>Early access preview</strong><p>Sign in with Discord to view the servers where you have management permissions. Module actions and live server controls are being added in stages.</p></div><a href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer">Follow development ↗</a></div>
          <DashboardLiveStatus />

          <div className="section-heading" id="modules"><div><div className="section-kicker">THE TOOLKIT</div><h2>Everything has its place.</h2></div><span className="section-meta">6 MODULES IN THE PLAN</span></div>
          <div className="module-grid">
            {modules.map((module) => (
              <article className="module-card" id={`module-${module.id}`} key={module.name}>
                <div className="module-top"><span className="module-icon">{module.icon}</span><span className={`pill ${module.tone}`}>{module.status}</span></div>
                <h3>{module.name}</h3><p>{module.description}</p><div className="card-foot"><span>GUILDNEST MODULE</span><span className="arrow">↗</span></div>
              </article>
            ))}
          </div>

          <div className="lower-grid">
            <section className="panel" id="commands">
              <div className="panel-heading"><div><div className="section-kicker">NESTMATE BOT</div><h2>Starter commands</h2></div><span className="bot-badge">N</span></div>
              <p className="panel-copy">Your Discord companion starts with a small, safe set of commands.</p>
              <div className="command-list">{commands.map((item) => <div className="command-row" key={item.command}><code>{item.command}</code><span>{item.detail}</span><span className="command-arrow">↗</span></div>)}</div>
              <div className="panel-note"><span>✓</span> These commands are implemented in the starter bot; they need to be registered and the bot started before they work in Discord.</div>
            </section>
            <section className="panel roadmap" id="roadmap">
              <div className="section-kicker">NEXT STEPS</div><h2>Small steps. Real progress.</h2>
              <div className="roadmap-list">
                <div className="roadmap-item"><span className="step-number done">✓</span><div><strong>Project foundation</strong><p>Repository and workspace structure</p></div><span className="roadmap-status">DONE</span></div>
                <div className="roadmap-item"><span className="step-number current">2</span><div><strong>Run NestMate locally</strong><p>Install packages and register commands</p></div><span className="roadmap-status current-text">NEXT</span></div>
                <div className="roadmap-item"><span className="step-number">3</span><div><strong>Polish the dashboard</strong><p>Build, test, and prepare deployment</p></div></div>
                <div className="roadmap-item"><span className="step-number">4</span><div><strong>Connect Discord safely</strong><p>Authentication and live server data</p></div></div>
              </div>
            </section>
          </div>
          <footer className="footer"><span>© 2026 GuildNest</span><span>Made for the people behind the community.</span><a href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer">Open source workspace ↗</a></footer>
        </div>
      </section>
    </main>
  );
}
