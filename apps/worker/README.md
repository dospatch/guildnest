# GuildNest NestMate — Cloudflare Worker

This is the HTTP-interactions replacement for the existing Gateway bot. The original apps/bot implementation remains untouched during migration.

## Required Worker secrets
- DISCORD_PUBLIC_KEY — Discord Developer Portal → General Information → Public Key.
- DISCORD_BOT_TOKEN — Bot token; never commit it.

The application ID is configured in wrangler.toml. Optional variables: TICKET_CATEGORY_ID, TICKET_STAFF_ROLE_ID, TICKET_LOG_CHANNEL_ID, UPDATES_CHANNEL_ID, BUG_REPORTS_CHANNEL_ID, SUGGESTIONS_CHANNEL_ID, FEEDBACK_CHANNEL_ID.

## Local development
From this directory:
```sh
npm install
# Create .dev.vars with DISCORD_PUBLIC_KEY= and DISCORD_BOT_TOKEN=
npm run typecheck
npm run dev
```

## Register commands
Use the existing apps/bot/src/register-commands.ts until the Worker command migration is complete.

## Deploy
```sh
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npm run deploy
```
Then set Discord Developer Portal → General Information → Interactions Endpoint URL to https://guildnest-nestmate.<your-subdomain>.workers.dev/interactions.

The endpoint verifies Ed25519 signatures and responds to Discord PING. HTTP interactions support slash commands, buttons, and modals, but do not deliver member-join, message, or presence Gateway events. The old Gateway code is intentionally retained until the Worker is deployed and all tests pass.
