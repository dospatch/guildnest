import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show NestMate commands and getting-started help.'),
  new SlashCommandBuilder()
    .setName('module')
    .setDescription('View GuildNest modules and their planned status.'),
  new SlashCommandBuilder()
    .setName('staff-center')
    .setDescription('Create and secure the private GuildNest Staff Center.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Build the standard GuildNest server layout and support ticket panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Check for missing GuildNest channels and roles, then offer safe restoration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('remodel-preview')
    .setDescription('Inspect your server and preview the complete safe GuildNest remodel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('remodel-apply')
    .setDescription('Apply the non-destructive GuildNest server remodel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('welcome-panel')
    .setDescription('Publish the official GuildNest welcome message and channel guide.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('about-me')
    .setDescription('Create or update your GuildNest community profile.'),
  new SlashCommandBuilder()
    .setName('rules-panel')
    .setDescription('Publish a rules acknowledgement panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('community-panel')
    .setDescription('Post the GuildNest Bug Reports, Suggestions, and Feedback panel.')
    .addAttachmentOption((option) => option.setName('image').setDescription('Optional screenshot or image to display on the panel').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('post-update')
    .setDescription('Publish an official announcement to the GuildNest updates channel.')
    .addStringOption((option) => option.setName('title').setDescription('Short update title').setMaxLength(256).setRequired(true))
    .addStringOption((option) => option.setName('message').setDescription('Details of the update').setMaxLength(4000).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post a ticket panel that routes new tickets into a chosen category.')
    .addChannelOption((option) =>
      option
        .setName('category')
        .setDescription('Category where tickets from this panel should be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());
