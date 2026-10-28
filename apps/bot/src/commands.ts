import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show NestMate commands and getting-started help.'),
  new SlashCommandBuilder()
    .setName('module')
    .setDescription('View GuildNest modules and their planned status.'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Build the standard GuildNest server layout and support ticket panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the GuildNest support ticket panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());
