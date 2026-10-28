import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="GuildNest home">
          <span className="landing-brand-mark">G<span>N</span></span>
          <span className="landing-brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a className="landing-nav-cta" href="/api/auth/discord">Sign in <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> DISCORD COMMUNITY TOOLS</div>
          <h1>Your community.<br /><em>In good hands.</em></h1>
          <p className="landing-lede">Make room for better communities. Bring your Discord server tools into one calm, organized workspace built to help you manage your community with confidence.</p>
          <div className="landing-actions">
            <a className="discord-login landing-primary" href="/api/auth/discord"><span aria-hidden="true">◈</span> Continue with Discord <span className="landing-arrow" aria-hidden="true">↗</span></a>
            <a className="landing-secondary" href="#features">Explore features <span aria-hidden="true">↓</span></a>
          </div>
          <p className="landing-privacy"><span aria-hidden="true">⌑</span> Secure sign-in with Discord OAuth2. We never ask for your Discord password.</p>
        </div>
        <div className="landing-visual" aria-label="Illustration of an organized GuildNest workspace">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-glow" />
          <div className="landing-dashboard-card">
            <div className="landing-card-top"><span className="landing-mini-mark">GN</span><span>YOUR WORKSPACE</span><span className="landing-card-dots">•••</span></div>
            <div className="landing-server-row"><div className="landing-server-icon">G</div><div><strong>Community hub</strong><small>Your server, organized</small></div><span className="landing-online-dot" /></div>
            <div className="landing-preview-line"><span>Community tools</span><span>READY TO EXPLORE</span></div>
            <div className="landing-tool-row"><span className="landing-tool-icon">⌘</span><div><strong>Server dashboard</strong><small>Your community overview</small></div><span className="landing-tool-arrow">↗</span></div>
            <div className="landing-tool-row"><span className="landing-tool-icon">◇</span><div><strong>Moderation tools</strong><small>Tools for a safer space</small></div><span className="landing-tool-arrow">↗</span></div>
            <div className="landing-tool-row"><span className="landing-tool-icon">☷</span><div><strong>Community setup</strong><small>Build your workflow</small></div><span className="landing-tool-arrow">↗</span></div>
            <div className="landing-card-foot"><span /> Thoughtfully organized. Community first.</div>
          </div>
          <div className="landing-float-note"><span>✦</span><div><strong>One workspace</strong><small>More clarity, less clutter</small></div></div>
        </div>
      </section>

      <section className="landing-trust-row" aria-label="GuildNest principles">
        <div><span className="landing-trust-icon">⌑</span><p><strong>Secure by design</strong><small>Discord OAuth2 sign-in</small></p></div>
        <div><span className="landing-trust-icon">◎</span><p><strong>Your servers, your access</strong><small>Choose a server you can manage</small></p></div>
        <div><span className="landing-trust-icon">↗</span><p><strong>Open-source project</strong><small>Built in the open on GitHub</small></p></div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-heading"><div><div className="landing-eyebrow"><span /> MADE FOR COMMUNITIES</div><h2>Less scattered. <em>More connected.</em></h2></div><p>Start with a clear overview, then explore the tools that fit the way your community works.</p></div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card"><span className="landing-feature-number">01</span><div className="landing-feature-icon">▦</div><h3>Server dashboard</h3><p>A central place to see your workspace and get to the tools you need.</p><span className="landing-feature-label">COMMUNITY OVERVIEW</span></article>
          <article className="landing-feature-card"><span className="landing-feature-number">02</span><div className="landing-feature-icon">◇</div><h3>Moderation tools</h3><p>Keep moderation workflows organized as the platform's tools become available.</p><span className="landing-feature-label">SAFER COMMUNITIES</span></article>
          <article className="landing-feature-card"><span className="landing-feature-number">03</span><div className="landing-feature-icon">☷</div><h3>Setup and modules</h3><p>Explore community modules and bring your server management into one workspace.</p><span className="landing-feature-label">BUILT TO GROW</span></article>
        </div>
        <p className="landing-feature-note"><span>i</span> GuildNest is actively being built. Availability varies by module; signing in does not automatically change your Discord server.</p>
      </section>

      <section className="landing-how" id="how-it-works">
        <div className="landing-how-heading"><div className="landing-eyebrow"><span /> SIMPLE BY DESIGN</div><h2>Three steps to your<br /><em>GuildNest workspace.</em></h2><p>No Discord password sharing. No guesswork about which servers you can manage.</p><a className="discord-login landing-primary" href="/api/auth/discord">Continue with Discord <span className="landing-arrow" aria-hidden="true">↗</span></a></div>
        <div className="landing-steps">
          <div className="landing-step"><span>01</span><div><h3>Sign in securely</h3><p>Authorize GuildNest through Discord's official sign-in page.</p></div><b>↗</b></div>
          <div className="landing-step"><span>02</span><div><h3>Choose your server</h3><p>See the servers where your Discord account has management access.</p></div><b>↗</b></div>
          <div className="landing-step"><span>03</span><div><h3>Open your dashboard</h3><p>Enter your workspace and explore the available community tools.</p></div><b>↗</b></div>
        </div>
      </section>

      <section className="landing-bottom-cta">
        <div><div className="landing-eyebrow"><span /> YOUR COMMUNITY STARTS HERE</div><h2>Ready to make room<br className="landing-mobile-break" /> for better communities?</h2><p>Sign in with Discord to get started with GuildNest.</p></div>
        <a className="discord-login landing-primary" href="/api/auth/discord">Continue with Discord <span className="landing-arrow" aria-hidden="true">↗</span></a>
      </section>

      <footer className="landing-footer"><a className="landing-brand landing-footer-brand" href="/"><span className="landing-brand-mark">G<span>N</span></span><span className="landing-brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span></a><span>© 2026 GuildNest. Built for better communities.</span><Link href="https://github.com/dospatch/guildnest" target="_blank" rel="noreferrer">Open-source on GitHub ↗</Link></footer>
    </main>
  );
}
