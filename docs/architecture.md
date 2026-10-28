# GuildNest Architecture

## Product
GuildNest is a modular Discord community management platform. NestMate is its Discord bot.

## Workspace layout
- `apps/web`: Next.js dashboard and public website.
- `apps/bot`: NestMate Discord bot and slash commands.
- `packages/shared`: shared types and validation.
- `packages/modules`: first-party module definitions and permission metadata.
- `docs`: architecture, setup, security, and release notes.

## First milestone
1. Bring NestMate online with `/help`, `/module`, and `/setup`.
2. Test commands in the GuildNest server.
3. Build the dashboard after bot authorization and command flows are tested.
4. Add tickets, applications, moderation, and other modules incrementally.

## Security rules
- Never commit bot tokens, OAuth client secrets, or database credentials.
- Do not grant Administrator just to make the bot work.
- Check guild permissions before every management action.
- Third-party modules must not execute arbitrary uploaded code.
- Ask for the minimum Discord permissions required by each enabled feature.

## Hosting
Develop and test locally first, then choose hosting that supports the required persistent bot runtime. A serverless web host alone should not be assumed to keep a Discord Gateway bot running continuously. Do not enable paid services without explicit approval.
