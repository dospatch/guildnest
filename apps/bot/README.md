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

The remodel creates or reuses matching channels, moves matching channels into their new categories without replacing their custom channel overwrites, and secures Staff Headquarters channels for recognized staff roles. It does not delete existing channels, messages, roles, or member role assignments. Old channels that are not part of the new layout are left in place for review and manual archival after their content and integrations have been checked.

The official layout includes:
- Start Here
- Official Updates
- Community
- Support Center
- GuildNest Resources
- Development
- Voice Lounge
- Private Staff Headquarters

## Publish the community experience

After applying the layout, run these commands as a server manager:

1. Run `/welcome-panel` in `#welcome` to publish or update the official GuildNest welcome guide.
2. Run `/rules-panel` to publish or update the community rules and acknowledgement button in `#rules-and-guidelines`.
3. Run `/ticket-panel` in `#create-a-ticket` and select the `04 — SUPPORT CENTER` category. This creates private member support tickets.
4. Run `/community-panel` in `#support-information`. This publishes the Community Center submission panel and About Me profile panel.

## Community Center form routing

Members use the buttons on the Community Center panel. NestMate opens a modal form, validates the destination, posts a structured embed in the correct channel, and privately confirms where the submission went.

| Form | Destination | Visibility |
|---|---|---|
| Staff/member report | `#staff-reports` | Staff-only |
| Bug report | `#bug-reports` | Community |
| Suggestion | `#suggestions` | Community |
| Feedback | `#feedback` | Community |
| Support request | `#staff-support` | Staff-only |

NestMate creates or secures `#staff-reports` and `#staff-support` under Staff Headquarters when `/community-panel` is run. These destinations deny `@everyone` visibility and grant access to recognized staff roles. The bot refuses to send a report or support request to a destination that is visible to everyone.

Optional Render environment variables can override destination lookup:
- `REPORTS_CHANNEL_ID`
- `BUG_REPORTS_CHANNEL_ID`
- `SUGGESTIONS_CHANNEL_ID`
- `FEEDBACK_CHANNEL_ID`
- `SUPPORT_REQUESTS_CHANNEL_ID`

If no ID is configured, NestMate finds the channel by its standard name. Keep reports and support requests private.

## Support and staff tools
- `/ticket-panel` publishes a private ticket panel.
- `/community-panel` publishes report, bug report, suggestion, feedback, and support forms.
- `/staff-center` provisions private staff channels.
- `/post-update` publishes an official update to the configured changelog channel.
- `/sync` checks for missing starter items and offers safe restoration.

## Permissions

For the remodel, NestMate needs Manage Channels, Manage Roles, View Channels, Send Messages, Read Message History, and Embed Links. Its highest role must be above the GuildNest roles whose channel permissions it needs to manage. Only assign staff roles to trusted team members.

Keep `.env` private and never commit bot tokens or other secrets.
