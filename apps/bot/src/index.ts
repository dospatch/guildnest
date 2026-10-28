import 'dotenv/config';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error('Missing DISCORD_BOT_TOKEN. Set it in your local environment; never commit it.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`NestMate is online as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
});

client.login(token);
