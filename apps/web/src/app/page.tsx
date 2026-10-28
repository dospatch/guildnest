import Link from 'next/link';

export default function Home() {
  return (
    <main className="signin-page">
      <header className="signin-header">
        <a className="brand signin-brand" href="/" aria-label="GuildNest home">
          <span className="brand-mark">G<span>N</span></span>
          <span className="brand-copy"><strong>GuildNest</strong><small>COMMUNITY PLATFORM</small></span>
        </a>
        <span className="signin-label"><i /> DISCORD COMMUNITY TOOLS</span>
      </header>

      <section className="signin-hero">
        <div className="signin-eyebrow"><span className="eyebrow-line" /> YOUR COMMUNITY, IN GOOD HANDS</div>
        <div className="signin-symbol" aria-hidden="true">G<span>N</span></div>
        <h1>Make room for<br /><em>better communities.</em></h1>
        <p className="signin-copy">GuildNest brings your Discord community tools together in one calm, organized workspace. Sign in with Discord first, then choose a server you have permission to manage.</p>
        <a className="discord-login signin-button" href="/api/auth/discord"><span aria-hidden="true">◈</span> Continue with Discord <span className="signin-arrow">↗</span></a>
        <p className="signin-privacy">Secure sign-in powered by Discord OAuth2. GuildNest never asks for your Discord password.</p>
        <div className="signin-features">
          <div><span>01</span><strong>Sign in securely</strong><p>Authorize your Discord account.</p></div>
          <div><span>02</span><strong>Choose your server</strong><p>See servers you can manage.</p></div>
          <div><span>03</span><strong>Open your dashboard</strong><p>Manage your GuildNest workspace.</p></div>
        </div>
        <footer className="signin-footer"><span>© 2026 GuildNest</span><Link href="https://github.com/dospatch/guildnest" target="_blank">Open-source project ↗</Link></footer>
      </section>
    </main>
  );
}
