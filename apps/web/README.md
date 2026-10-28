# GuildNest Web Dashboard

The first GuildNest dashboard interface is built with Next.js and TypeScript. It uses an original dark UI with orange accents and is responsive for desktop and mobile screens.

## Current milestone

- Dashboard overview and module roadmap
- NestMate starter command reference
- Responsive layout for mobile and desktop
- Discord OAuth login and managed-server listing are implemented; configure the OAuth environment variables in the root README. The dashboard refreshes session/server summary every 30 seconds while open. Live guild metrics and module actions are still planned.

## Run locally

From the repository root:

```powershell
npm install
npm run dev:web
```

Then open http://localhost:3000.

Build and type-check:

```powershell
npm run typecheck:web
npm run build:web
```

The bot and dashboard are separate workspace apps. Run the bot using the root scripts documented in the repository README. Never put bot tokens in frontend code or commit secrets.
