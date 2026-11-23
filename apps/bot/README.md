# NestMate Bot

NestMate is the official Discord bot for GuildNest. It powers the GuildNest community server, support tickets, community forms, welcome messages, and server layout tools.

## Requirements
- Node.js 20 or newer
- A Discord application with a bot user
- Server permissions appropriate to the enabled features

## Local setup
1. From the repository root, install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID`.
3. Set `DISCORD_GUILD_ID` to the GuildNest server ID for fast server-specific command registration.
4. Run `npm run register:commands`.
5. Run `npm run dev:bot`.

## Official GuildNest server remodel

The bot includes a safe, non-destructive remodel workflow:

1. Run `/remodel-preview` in the GuildNest server to inspect the current channel/role inventory and required bot permissions.
2. Review the preview.
3. Run `/remodel-apply` to create the official GuildNest categories, channels, and missing GuildNest roles.

The remodel creates or reuses matching channels, moves matching channels into their new categories without replacing their custom channel overwrites, and secures the Staff Headquarters channels for recognized staff roles. It does not delete existing channels, messages, roles, or member role assignments. Old channels that are not part of the new layout are left in place for review and manual archival after their content and integrations have been checked.

The official layout includes:
- Start Here
- Official Updates
- Community
- Support Center
- GuildNest Resources
- Development
- Voice Lounge
- Private Staff Headquarters

After applying the layout:
- Run `/welcome-panel` in `#welcome`.
- Run `/rules-panel` to publish the rules acknowledgement panel in `#rules-and-guidelines`.
- Run `/ticket-panel` in `#create-a-ticket` and select the `04 — SUPPORT CENTER` category.
- Run `/community-panel` in the appropriate public channel if you want to publish the community forms.

## Support and staff tools
- `/ticket-panel` publishes a private ticket panel.
- `/community-panel` publishes bug report, suggestion, feedback, report, and support forms.
- `/staff-center` provisions private staff channels.
- `/post-update` publishes an official update to the configured updates/changelog channel.
- `/sync` checks for missing starter items and offers safe restoration.

## Permissions

For the remodel, NestMate needs Manage Channels, Manage Roles, View Channels, Send Messages, Read Message History, and Embed Links. Its highest role must be above the GuildNest roles whose channel permissions it needs to manage. Only assign staff roles to trusted team members.

Keep `.env` private and never commit bot tokens or other secrets.
