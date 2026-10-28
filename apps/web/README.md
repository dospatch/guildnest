# GuildNest Web Dashboard

The first GuildNest dashboard interface is built with Next.js and TypeScript. It uses an original dark UI with orange accents and is responsive for desktop and mobile screens.

## Current milestone

- Dashboard overview and module roadmap
- NestMate starter command reference
- Responsive layout for mobile and desktop
- No Discord login, live guild data, or module actions yet; those are planned integration steps

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
