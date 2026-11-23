'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

const modules = [
  { id: 'server-overview', icon: '⌘', name: 'Server overview', tone: 'ready' },
  { id: 'tickets-support', icon: '◷', name: 'Tickets & support', tone: 'ready' },
  { id: 'community-center', icon: '◇', name: 'Community Center', tone: 'ready' },
  { id: 'server-setup', icon: '▤', name: 'Server setup & sync', tone: 'ready' },
  { id: 'moderation', icon: '⚑', name: 'Moderation', tone: 'planned' },
  { id: 'applications', icon: '▣', name: 'Applications', tone: 'planned' },
  { id: 'activity-logs', icon: '↗', name: 'Activity & logs', tone: 'planned' },
];

export default function DashboardSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <>
      <button
        className="sidebar-mobile-trigger"
        type="button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span /><span /><span />
      </button>
      {open && <button className="mobile-nav-overlay" aria-label="Close navigation menu" onClick={close} />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <a className="brand" href="/dashboard" aria-label="GuildNest dashboard" onClick={close}>
          <span className="brand-mark"><img src="/guildnest-mark.svg" alt="" /></span>
          <span className="brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className={`nav-item${pathname === '/dashboard' ? ' active' : ''}`} href="/dashboard" onClick={close}>
            <span>◇</span> Modules <span className="nav-count">{modules.length}</span>
          </a>
        </nav>
        <div className="sidebar-module-heading">YOUR MODULES</div>
        <nav className="sidebar-module-list" aria-label="GuildNest modules">
          {modules.map((module) => (
            <a
              className="sidebar-module-item"
              href={pathname === '/dashboard' ? `#module-${module.id}` : `/dashboard#module-${module.id}`}
              key={module.id}
              onClick={close}
            >
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
            <span className="status-dot" aria-label="Bot service status" />
            <p>Your Discord companion for GuildNest modules and server tools.</p>
          </div>
          <a className="github-link" href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer"><span>↗</span> View project on GitHub</a>
          <div className="sidebar-foot">GuildNest modules, all in one place.</div>
        </div>
      </aside>
    </>
  );
}
