# GuildNest

GuildNest is a modular Discord community management platform. **NestMate** is its Discord bot companion.

The project is organized as a small monorepo:

- `apps/bot` — NestMate Discord bot (TypeScript + discord.js)
- `apps/web` — responsive GuildNest dashboard (Next.js + TypeScript)
- `packages/shared` — shared code planned for later milestones
- `packages/modules` — modular feature foundation planned for later milestones

## Requirements

- Node.js 20 or newer (use the current LTS release)
- npm, included with the Node.js installer
- A Discord application and bot created in the Discord Developer Portal to run NestMate

## Install dependencies

From the repository root:

```powershell
npm install
```

## Run the dashboard

```powershell
npm run dev:web
```

Open http://localhost:3000. The current dashboard is a frontend preview; Discord sign-in and live server data are not connected yet.

## Run NestMate locally

1. Copy `.env.example` to a file named `.env` in the repository root.
2. Fill in `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` in that local file. Optionally set `DISCORD_GUILD_ID` to register commands to one test server first.
3. Register commands:

   ```powershell
   npm run register:commands
   ```

4. Start the bot:

   ```powershell
   npm run dev:bot
   ```

Never paste your bot token into chat, screenshots, source code, or GitHub. If a token is accidentally exposed, reset it in the Discord Developer Portal.

## Checks

```powershell
npm run typecheck:bot
npm run typecheck:web
npm run build:web
```

## Project status

The starter slash commands are `/help`, `/module`, and `/setup`. The setup command is guidance-only; it does not create or change channels, roles, or permissions. Tickets, applications, moderation actions, Discord authentication, live server data, and persistent hosting are future milestones.

We are keeping development free-first. Do not add paid services or subscriptions without explicit approval.
