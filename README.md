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

## Configure Discord sign-in on Vercel

In the Discord Developer Portal, open your application and add this exact redirect URI under OAuth2 Redirects:

`https://guildnest.vercel.app/api/auth/callback`

Use this exact URL in both the Discord Developer Portal OAuth2 Redirects list and the Vercel `DISCORD_REDIRECT_URI` environment variable. Add these environment variables to the Vercel project (Production and Preview as appropriate):

- `DISCORD_CLIENT_ID` — your Discord application/client ID
- `DISCORD_CLIENT_SECRET` — the OAuth2 client secret from the Developer Portal; keep it private
- `DISCORD_REDIRECT_URI` — the exact callback URL above
- `SESSION_SECRET` — a random secret of at least 32 characters, used to encrypt the session cookie

You can generate a strong session secret locally with Node.js using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never commit real values to GitHub or paste secrets into chat. After setting variables, redeploy the Vercel project.

The bot token is separate from the OAuth client secret. Discord login does not automatically connect the bot or implement module actions.

## Run the dashboard

```powershell
npm run dev:web
```

Open http://localhost:3000. The dashboard supports Discord OAuth sign-in and lists servers where the signed-in user has management permissions. A dashboard status panel refreshes the session and managed-server list every 30 seconds while the page is open. Configure the Discord OAuth environment variables below before sign-in will work.

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

The starter slash commands are `/help`, `/module`, and `/setup`. The setup command is guidance-only; it does not create or change channels, roles, or permissions. Discord OAuth and managed-server listing are implemented but require environment configuration. The dashboard status panel refreshes the session and managed-server list every 30 seconds while the page is open. Tickets, applications, moderation actions, and live guild metrics remain future milestones.

We are keeping development free-first. Do not add paid services or subscriptions without explicit approval.
