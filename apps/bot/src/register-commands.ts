import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
  throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID in your local environment.');
}

const rest = new REST({ version: '10' }).setToken(token);

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands });
  console.log(`Registered ${commands.length} development commands in guild ${guildId}.`);
} else {
  await rest.put(Routes.applicationCommands(applicationId), { body: commands });
  console.log(`Registered ${commands.length} global commands. Global command updates can take time to appear.`);
}
