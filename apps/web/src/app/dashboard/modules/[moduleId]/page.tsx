import Link from 'next/link';
import { notFound } from 'next/navigation';

const moduleDetails = {
  'server-overview': {
    icon: '⌘',
    name: 'Server overview',
    status: 'Live',
    description: 'See the Discord communities your account can manage and keep your workspace in view.',
    availability: 'Available in the GuildNest dashboard',
    features: ['Discord sign-in with OAuth2', 'Managed-server list based on your Discord permissions', 'Automatic refresh of your server list'],
    access: 'Sign in with Discord and open the Modules dashboard. Your manageable servers appear in the live connection panel.',
  },
  'tickets-support': {
    icon: '◷',
    name: 'Tickets & support',
    status: 'Live',
    description: 'Give members a private place to ask for help, and give staff a clear way to manage requests.',
    availability: 'Available through NestMate',
    features: ['Post a ticket panel in a selected category', 'Create private ticket channels for members', 'Allow support staff to claim tickets', 'Close and reopen tickets while retaining staff history', 'Optional ticket event logging'],
    access: 'Use /ticket-panel in Discord and select the category where new tickets should be created. Configure TICKET_STAFF_ROLE_ID and TICKET_LOG_CHANNEL_ID in the bot host when needed.',
  },
  'community-center': {
    icon: '◇',
    name: 'Community Center',
    status: 'Live',
    description: 'Collect community bug reports, suggestions, and general feedback with structured forms.',
    availability: 'Available through NestMate',
    features: ['Bug report modal forms', 'Suggestion submission and voting', 'General feedback forms', 'Separate destination channels for each submission type'],
    access: 'Use /community-panel to publish the buttons. NestMate looks for #bug-reports, #suggestions, and #feedback, or uses the configured channel IDs.',
  },
  'server-setup': {
    icon: '▤',
    name: 'Server setup & sync',
    status: 'Live',
    description: 'Set up GuildNest starter spaces and safely restore missing community resources.',
    availability: 'Available through NestMate',
    features: ['Starter category, channel, and role setup', 'Preview the proposed server remodel before applying it', 'Restore missing configured items with safe sync', 'Preserve existing channels and messages during restoration'],
    access: 'Use /setup for the starter layout, /sync to check for missing items, and /remodel-preview before /remodel-apply. Review the preview carefully before applying changes.',
  },
  moderation: {
    icon: '⚑',
    name: 'Moderation',
    status: 'Planned',
    description: 'A dedicated space for moderation workflows and staff safety tools.',
    availability: 'In development',
    features: ['Moderation action workflows', 'Staff-facing moderation tools', 'Clear records of moderation activity'],
    access: 'This module is not available yet. It will be enabled after its bot permissions, audit behavior, and dashboard controls are implemented and tested.',
  },
  applications: {
    icon: '▣',
    name: 'Applications',
    status: 'Planned',
    description: 'Create application forms and manage staff recruitment from one place.',
    availability: 'Planned',
    features: ['Configurable application forms', 'Application review and status tracking', 'Staff recruitment workflows'],
    access: 'This module is not available yet. Application submissions and review controls are still being developed.',
  },
  'activity-logs': {
    icon: '↗',
    name: 'Activity & logs',
    status: 'Planned',
    description: 'Bring important server events and staff activity into one organized view.',
    availability: 'Planned',
    features: ['Central activity timeline', 'Staff and server event records', 'Searchable audit history'],
    access: 'This module is not available yet. Event collection, storage, and dashboard views still need to be built.',
  },
} as const;

type ModuleId = keyof typeof moduleDetails;

export default async function ModuleDetailPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (!(moduleId in moduleDetails)) notFound();
  const item = moduleDetails[moduleId as ModuleId];
  const live = item.status === 'Live';

  return (
    <main className="module-detail-page">
      <header className="module-detail-topbar">
        <Link href="/dashboard" className="module-detail-brand"><span className="brand-mark">G<span>N</span></span><span><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span></Link>
        <Link href="/dashboard" className="module-detail-back">← All modules</Link>
      </header>
      <section className="module-detail-content">
        <div className="module-detail-eyebrow">GUILDNEST MODULE LIBRARY</div>
        <div className="module-detail-title-row">
          <span className="module-detail-icon">{item.icon}</span>
          <span className={`pill ${live ? 'ready' : 'planned'}`}>{item.status}</span>
        </div>
        <h1>{item.name}</h1>
        <p className="module-detail-description">{item.description}</p>
        <div className="module-detail-grid">
          <section className="module-detail-panel">
            <span className="module-detail-label">WHAT'S INCLUDED</span>
            <h2>Module capabilities</h2>
            <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </section>
          <section className="module-detail-panel">
            <span className="module-detail-label">AVAILABILITY</span>
            <h2>{item.availability}</h2>
            <p>{item.access}</p>
            <Link href="/dashboard" className="module-detail-action">{live ? 'Back to dashboard' : 'View all modules'} <span>↗</span></Link>
          </section>
        </div>
        <footer className="module-detail-footer"><span>© 2026 GuildNest</span><span>Module availability is updated as verified features are released.</span></footer>
      </section>
    </main>
  );
}
