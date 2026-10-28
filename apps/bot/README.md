# NestMate Bot

NestMate is the Discord bot for GuildNest.

## Requirements
- Node.js 20 or newer
- A Discord application with a bot user

## Local setup
1. From the repository root, install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID`.
3. For fast server-specific command updates, set `DISCORD_GUILD_ID` to your GuildNest server ID.
4. Run `npm run register:commands`.
5. Run `npm run dev:bot`.

Keep `.env` private and never commit bot tokens. The `/setup` command is currently a checklist and does not create or edit server channels or roles.
