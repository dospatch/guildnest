import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show NestMate commands and getting-started help.'),
  new SlashCommandBuilder()
    .setName('module')
    .setDescription('View GuildNest modules and their planned status.'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Show the safe first-time setup checklist for this server.'),
].map((command) => command.toJSON());
