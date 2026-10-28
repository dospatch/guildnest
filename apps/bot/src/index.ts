import 'dotenv/config';
import { createServer } from 'node:http';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error('Missing DISCORD_BOT_TOKEN. Set it in the hosting environment; never commit it.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Render free Web Services require an HTTP port. This health endpoint also lets us
// check whether the Discord Gateway connection is ready without exposing secrets.
const port = Number(process.env.PORT || 3000);
const server = createServer((request, response) => {
  // Normalize the URL so query strings and trailing slashes don't break health checks.
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname.replace(/\\/+$/, '') || '/';
  if (pathname === '/health' || pathname === '/api/health' || pathname === '/') {
    const online = client.isReady();
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify({
      service: 'GuildNest NestMate',
      status: online ? 'online' : 'starting',
      discordConnected: online,
    }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`NestMate health server listening on port ${port}.`);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`NestMate is online as ${readyClient.user.tag}.`);
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error.message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'help') {
      await interaction.reply({
        content: '**NestMate · GuildNest**\n\n`/help` — show this help\n`/module` — view module status\n`/setup` — view the server setup checklist\n\nGuildNest is in early development. Features are being added in stages.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === 'module') {
      await interaction.reply({
        content: '**GuildNest Modules**\n\n🟢 **Core commands** — ready once commands are registered\n🟡 **Server setup** — checklist only; no channels or roles are changed automatically yet\n⚪ **Tickets, applications, moderation, and dashboard** — planned',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.commandName === 'setup') {
      await interaction.reply({
        content: '**GuildNest setup checklist**\n\n1. Create information, community, and support channels.\n2. Decide which staff roles may manage the server.\n3. Keep NestMate’s permissions limited to enabled features.\n4. Dashboard linking and automated setup are not implemented yet.\n\nThis command provides guidance only and will not change your server.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error('Command handler failed:', error instanceof Error ? error.message : 'Unknown error');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'NestMate ran into a problem handling that command. Please try again later.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => undefined);
    }
  }
});

client.login(token).catch((error: unknown) => {
  console.error(
    'NestMate could not connect to Discord. Check that DISCORD_BOT_TOKEN belongs to this application.',
    error instanceof Error ? error.message : 'Unknown login error',
  );
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('Shutting down NestMate.');
  client.destroy();
  server.close(() => process.exit(0));
});
