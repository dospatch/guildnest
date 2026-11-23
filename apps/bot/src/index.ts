import 'dotenv/config';
import { createServer } from 'node:http';
import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  type OverwriteResolvable,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error('Missing DISCORD_BOT_TOKEN. Set it in the hosting environment; never commit it.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
const ticketStaffRoleId = process.env.TICKET_STAFF_ROLE_ID;
const ticketLogChannelId = process.env.TICKET_LOG_CHANNEL_ID;
const updatesChannelId = process.env.UPDATES_CHANNEL_ID;
const bugReportsChannelId = process.env.BUG_REPORTS_CHANNEL_ID;
const suggestionsChannelId = process.env.SUGGESTIONS_CHANNEL_ID;
const feedbackChannelId = process.env.FEEDBACK_CHANNEL_ID;

const moduleCatalog = [
  { id: 'server-overview', name: 'Server overview', status: 'Live', short: 'Your manageable Discord servers', description: 'View the Discord servers your account can manage in the GuildNest dashboard.', access: 'Sign in to the GuildNest website with Discord. Your manageable servers appear in the live connection panel.' },
  { id: 'tickets-support', name: 'Tickets & support', status: 'Live', short: 'Private support conversations', description: 'Members can open private tickets. Support staff can claim, close, and reopen requests.', access: 'Use /ticket-panel and choose the category where new tickets should be created.' },
  { id: 'welcome-community', name: 'Welcome & Community Hub', status: 'Live', short: 'Welcome guides, rules, and routed member forms', description: 'Configurable welcome content, channel guides, rules acknowledgement, and member forms routed to the correct staff channels.', access: 'Use /welcome-panel, /rules-panel, and /community-panel.' },
  { id: 'community-center', name: 'Community Center', status: 'Live', short: 'Reports, suggestions, feedback, and member profiles', description: 'Structured reports, bug reports, suggestions with community voting, feedback, support requests, and About Me member profiles. Each form routes to its matching channel.', access: 'Use /community-panel to publish the forms, suggestion embed, and About Me profile button.' },
  { id: 'server-setup', name: 'Server setup & sync', status: 'Live', short: 'Safe server setup and restoration', description: 'Create the starter GuildNest layout, preview a remodel, and safely restore missing items.', access: 'Use /setup, /sync, /remodel-preview, and /remodel-apply. Review the preview before applying changes.' },
  { id: 'moderation', name: 'Moderation', status: 'Planned', short: 'Moderation and staff safety tools', description: 'A dedicated moderation workspace with staff workflows and clear action records.', access: 'This module is still in development and is not available yet.' },
  { id: 'applications', name: 'Applications', status: 'Planned', short: 'Forms and recruitment workflows', description: 'Create application forms, review submissions, and manage staff recruitment.', access: 'This module is still in development and is not available yet.' },
  { id: 'activity-logs', name: 'Activity & logs', status: 'Planned', short: 'Central server and staff activity', description: 'A searchable timeline of important server events and staff activity.', access: 'This module is still in development and is not available yet.' },
] as const;

const moduleMenu = () => new StringSelectMenuBuilder()
  .setCustomId('guildnest:module:select')
  .setPlaceholder('Choose a module to view details')
  .addOptions(moduleCatalog.map((module) => ({
    label: module.name,
    value: module.id,
    description: `${module.status} · ${module.short}`.slice(0, 100),
  })));

const moduleOverviewEmbed = () => new EmbedBuilder()
  .setColor(0xFF8A3D)
  .setTitle('GuildNest Module Library')
  .setDescription('Choose a module below to view its features and how to access it.')
  .addFields(moduleCatalog.map((module) => ({
    name: `${module.status === 'Live' ? '🟢' : '🟡'} ${module.name}`,
    value: module.short,
    inline: true,
  })))
  .setFooter({ text: 'GuildNest · Module availability changes with verified releases' });

const moduleDetailEmbed = (moduleId: string) => {
  const module = moduleCatalog.find((item) => item.id === moduleId);
  if (!module) return moduleOverviewEmbed();
  return new EmbedBuilder()
    .setColor(module.status === 'Live' ? 0x57F287 : 0xF1C40F)
    .setTitle(module.name)
    .setDescription(module.description)
    .addFields(
      { name: 'Availability', value: module.status, inline: true },
      { name: 'How to access', value: module.access, inline: false },
    )
    .setFooter({ text: 'GuildNest · Select another module below to continue' });
};

const communityPanel = () => new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle('GuildNest Community Center')
  .setDescription('Choose the form that matches what you need. Reports, bug reports, suggestions, feedback, and support requests are routed to their matching channels. Use the About Me button below to publish your member profile.')
  .addFields(
    { name: '🚩 Reports', value: 'Privately report a member or community concern to staff.', inline: true },
    { name: '🐛 Bug Reports', value: 'Report errors, broken commands, or unexpected behavior.', inline: true },
    { name: '💡 Suggestions', value: 'Suggest features and improvements.', inline: true },
    { name: '💬 Feedback', value: 'Share feedback about GuildNest or the community.', inline: true },
    { name: '🆘 Support', value: 'Send a support request to the support team.', inline: true },
  )
  .setFooter({ text: 'Powered by NestMate · GuildNest' });

const suggestionPanelEmbed = () => new EmbedBuilder()
  .setColor(0x57F287)
  .setTitle('💡 GuildNest Suggestions')
  .setDescription('Have an idea that could make GuildNest or this community better? Submit it below. Suggestions are routed to the suggestions channel for review and community voting.')
  .addFields(
    { name: 'How to suggest', value: 'Give your idea a clear title, explain how it would work, and tell us what problem it solves.' },
    { name: 'Community voting', value: 'Members can vote on submitted ideas using the vote button attached to each suggestion.' },
  )
  .setFooter({ text: 'GuildNest · Community Ideas' });

const feedbackPanelEmbed = () => new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle('💬 GuildNest Feedback')
  .setDescription('Your feedback helps us improve GuildNest and the community. Share what is working well, what could be better, or what you would like the team to know.')
  .addFields(
    { name: 'What to include', value: 'Be specific and constructive. You can share positive feedback, concerns, or ideas for improvement.' },
    { name: 'Where it goes', value: 'Feedback is delivered to the designated feedback channel for the team to review.' },
  )
  .setFooter({ text: 'GuildNest · Community Feedback' });

const aboutMePanelRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId('guildnest:about-me:open').setLabel('Create About Me').setEmoji('👤').setStyle(ButtonStyle.Primary),
);

const communityPanelRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId('guildnest:community:report').setLabel('Report').setEmoji('🚩').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('guildnest:community:bug').setLabel('Bug Report').setEmoji('🐛').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('guildnest:community:suggestion').setLabel('Suggestion').setEmoji('💡').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('guildnest:community:feedback').setLabel('Feedback').setEmoji('💬').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('guildnest:community:support').setLabel('Support').setEmoji('🆘').setStyle(ButtonStyle.Secondary),
);

const aboutMeModal = () => new ModalBuilder()
  .setCustomId('guildnest:about-me:submit')
  .setTitle('Create Your About Me')
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId('display-name').setLabel('What should we call you?').setStyle(TextInputStyle.Short).setMaxLength(60).setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId('interests').setLabel('Your interests').setStyle(TextInputStyle.Short).setMaxLength(120).setRequired(true),
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId('about').setLabel('A little about you').setStyle(TextInputStyle.Paragraph).setMaxLength(900).setRequired(true),
    ),
  );

const communityModal = (kind: 'report' | 'bug' | 'suggestion' | 'feedback' | 'support') => {
  const labels = {
    report: { title: 'Submit a Staff Report', description: 'What are you reporting?', placeholder: 'Describe what happened, when it happened, and include relevant message links or evidence...' },
    bug: { title: 'Submit a Bug Report', description: 'What went wrong?', placeholder: 'Steps to reproduce, error message, expected result...' },
    suggestion: { title: 'Submit a Suggestion', description: 'What would you like to see?', placeholder: 'Describe your idea and why it would help...' },
    feedback: { title: 'Send General Feedback', description: 'Tell us what you think', placeholder: 'Share your feedback...' },
    support: { title: 'Request Support', description: 'What do you need help with?', placeholder: 'Describe the issue and what you have tried...' },
  }[kind];
  return new ModalBuilder()
    .setCustomId(`guildnest:community:submit:${kind}`)
    .setTitle(labels.title)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setPlaceholder(labels.description),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('details').setLabel('Details').setStyle(TextInputStyle.Paragraph).setMaxLength(1800).setRequired(true).setPlaceholder(labels.placeholder),
      ),
    );
};

const findSubmissionChannel = (
  guild: import('discord.js').Guild,
  configuredId: string | undefined,
  names: string[],
): import('discord.js').TextChannel | undefined => {
  const configured = configuredId ? guild.channels.cache.get(configuredId) : undefined;
  if (configured?.type === ChannelType.GuildText) return configured;
  return guild.channels.cache.find(
    (channel): channel is import('discord.js').TextChannel =>
      channel.type === ChannelType.GuildText &&
      names.includes(channel.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')),
  );
};

const botMemberHasPermission = (guild: import('discord.js').Guild, permission: bigint) =>
  Boolean(guild.members.me?.permissions.has(permission));

const ensurePrivateStaffSubmissionChannels = async (guild: import('discord.js').Guild) => {
  const botMember = guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('NestMate needs Manage Channels to prepare private staff submission channels.');
  }

  const staffRoleNames = new Set([
    'owner', 'management', 'manager', 'admin', 'administrator', 'moderator',
    'guildnest moderator', 'support team',
  ]);
  const staffRoles = guild.roles.cache.filter((role) =>
    staffRoleNames.has(role.name.toLowerCase()) &&
    !role.managed &&
    role.position < botMember.roles.highest.position,
  );

  let category = guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === 'staff',
  ) as import('discord.js').CategoryChannel | undefined;
  if (!category) {
    category = await guild.channels.create({
      name: 'STAFF',
      type: ChannelType.GuildCategory,
      reason: 'Create private GuildNest staff submission area',
    });
  }

  // Apply targeted overwrites instead of replacing the category's full overwrite
  // list, so existing staff access and custom permissions are preserved.
  await category.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }, 'Keep GuildNest staff area private');
  for (const role of staffRoles.values()) {
    await category.permissionOverwrites.edit(role.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      EmbedLinks: true, AttachFiles: true,
    }, 'Grant existing staff role access to GuildNest staff submissions');
  }
  await category.permissionOverwrites.edit(botMember.id, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    ManageChannels: true, EmbedLinks: true, AttachFiles: true,
  }, 'Allow NestMate to route private GuildNest submissions');

  const destinations: import('discord.js').TextChannel[] = [];
  for (const [name, topic] of [
    ['staff-reports', 'Private member reports visible to authorized staff only.'],
    ['staff-support', 'Private support requests visible to authorized staff only.'],
  ] as const) {
    let channel = guild.channels.cache.find((item) =>
      item.type === ChannelType.GuildText && item.name.toLowerCase() === name,
    ) as import('discord.js').TextChannel | undefined;
    if (!channel) {
      channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic,
        reason: 'Create private GuildNest submission destination',
      });
    }
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }, 'Keep private GuildNest submissions staff-only');
    for (const role of staffRoles.values()) {
      await channel.permissionOverwrites.edit(role.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
        EmbedLinks: true, AttachFiles: true,
      }, 'Grant existing staff role access to private GuildNest submissions');
    }
    await channel.permissionOverwrites.edit(botMember.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      ManageChannels: true, EmbedLinks: true, AttachFiles: true,
    }, 'Allow NestMate to deliver private GuildNest submissions');
    destinations.push(channel);
  }
  return destinations;
};

const findNamedTextChannel = (
  guild: import('discord.js').Guild,
  configuredId: string | undefined,
  names: string[],
): import('discord.js').TextChannel | undefined => {
  const configured = configuredId ? guild.channels.cache.get(configuredId) : undefined;
  if (configured?.type === ChannelType.GuildText) return configured;
  return guild.channels.cache.find(
    (channel): channel is import('discord.js').TextChannel =>
      channel.type === ChannelType.GuildText && names.includes(channel.name.toLowerCase()),
  );
};

const logTicketEvent = async (guild: import('discord.js').Guild, embed: EmbedBuilder) => {
  const logChannel = findNamedTextChannel(guild, ticketLogChannelId, ['discord-logs', 'ticket-logs', 'logs', 'bot-logs']);
  if (!logChannel) {
    console.warn('Ticket event not logged: set TICKET_LOG_CHANNEL_ID in Render or create #discord-logs, #ticket-logs, #logs, or #bot-logs.');
    return false;
  }
  await logChannel.send({ embeds: [embed] });
  return true;
};

const ticketLogEmbed = (title: string, color: number, fields: { name: string; value: string; inline?: boolean }[]) =>
  new EmbedBuilder().setColor(color).setTitle(title).addFields(fields).setTimestamp().setFooter({ text: 'NestMate · GuildNest audit log' });


const ticketPanelRow = (categoryId?: string) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(categoryId ? `guildnest:ticket:create:${categoryId}` : 'guildnest:ticket:create')
    .setLabel('Open a support ticket')
    .setEmoji('🎫')
    .setStyle(ButtonStyle.Primary),
);

const ticketControls = (claimed = false, closed = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId('guildnest:ticket:claim')
    .setLabel(claimed ? 'Ticket claimed' : 'Claim ticket')
    .setEmoji('🙋')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(claimed || closed),
  new ButtonBuilder()
    .setCustomId(closed ? 'guildnest:ticket:reopen' : 'guildnest:ticket:close')
    .setLabel(closed ? 'Reopen ticket' : 'Close ticket')
    .setEmoji(closed ? '🔓' : '🔒')
    .setStyle(closed ? ButtonStyle.Success : ButtonStyle.Danger),
);

// Render free Web Services require an HTTP port. This health endpoint checks
// whether the Discord Gateway connection is ready without exposing secrets.
const port = Number(process.env.PORT || 3000);
const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname.replace(/\/+$/, '') || '/';
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

const guildNestWelcomeEmbed = (member?: import('discord.js').GuildMember, guild?: import('discord.js').Guild) => {
  const guide = (name: string, fallback: string) => {
    const aliases: Record<string, string[]> = {
      'rules-and-guidelines': ['rules-and-guidelines', 'rules'],
      'general-chat': ['general-chat', 'general'],
      'create-a-ticket': ['create-a-ticket', 'support-tickets'],
      'changelog': ['changelog', 'updates'],
    };
    const accepted = aliases[name] ?? [name];
    const channel = guild?.channels.cache.find((item) => item.type === ChannelType.GuildText && accepted.includes(item.name.toLowerCase()));
    return channel ? '<#' + channel.id + '>' : fallback;
  };
  const greeting = member ? '👋 **WELCOME ABOARD, <@' + member.id + '>!**' : '👋 **WELCOME ABOARD!**';
  const description = [
    '🌐 **WELCOME TO THE OFFICIAL GUILDNEST COMMUNITY!**',
    '',
    '🧩 *Build Better Servers • Smarter Management • Stronger Communities*',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    greeting,
    '',
    'We’re glad you’re here! GuildNest is a Discord management platform built to help server owners build, manage, automate, and improve their communities. Explore the server, meet other members, share ideas, and discover what NestMate can do.',
    '',
    '🚀 **GET STARTED**',
    '',
    '📜 **READ THE RULES**',
    'Start with ' + guide('rules-and-guidelines', 'the rules channel') + ' and acknowledge the community guidelines.',
    '',
    '🧭 **EXPLORE THE COMMUNITY**',
    'Visit ' + guide('announcements', 'announcements') + ' for news, ' + guide('changelog', 'the changelog') + ' for platform changes, and ' + guide('general-chat', 'general chat') + ' to meet the community.',
    '',
    '🧩 **DISCOVER GUILDNEST MODULES**',
    'Explore server setup, tickets, welcome tools, community forms, and other GuildNest features. Ask questions in ' + guide('create-a-ticket', 'the support center') + '.',
    '',
    '💡 **SHARE IDEAS & REPORT ISSUES**',
    'Use the Community Center to submit suggestions, bug reports, feedback, support requests, or a private report. Submissions are routed to the appropriate team channel.',
    '',
    '👤 **INTRODUCE YOURSELF**',
    'Say hello in ' + guide('introductions', 'introductions') + ' and use the About Me profile button to tell the community a little about yourself.',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '🤝 **OUR PARTNERSHIP WITH MODORA**',
    'We’re excited to work toward an integration with Modora, explore new possibilities, and create more opportunities for Discord communities.',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '❤️ **OUR COMMUNITY EXPECTATIONS**',
    '🤝 Respect every member and staff team.',
    '💬 Keep conversations friendly and constructive.',
    '🚫 No harassment, spam, or unnecessary drama.',
    '🔒 Respect everyone’s privacy.',
    '📌 Use the correct channels and approved support forms.',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '✨ **WHAT MAKES GUILDNEST SPECIAL?**',
    '🧩 Powerful community management tools',
    '⚙️ Automation and server organization',
    '🎫 Support and ticket workflows',
    '💡 Community feedback and suggestions',
    '🤝 A growing community of server builders',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '🌐 **THANK YOU FOR BEING HERE!**',
    'Explore the channels, share your ideas, and help us build a better experience for Discord communities.',
    '',
    '**GUILDNEST**',
    '🧩 *Build Better Servers • Stronger Communities*',
  ].join('\n');
  return new EmbedBuilder()
    .setColor(0xFF8A3D)
    .setTitle('👋 Official Welcome')
    .setDescription(description)
    .setFooter({ text: 'GuildNest · Official Welcome' });
};

const findWelcomeChannel = (guild: import('discord.js').Guild) => {
  const configuredId = process.env.WELCOME_CHANNEL_ID;
  const configured = configuredId ? guild.channels.cache.get(configuredId) : undefined;
  if (configured?.type === ChannelType.GuildText) return configured;
  return guild.channels.cache.find((channel): channel is import('discord.js').TextChannel =>
    channel.type === ChannelType.GuildText && ['welcome', 'welcome-here', 'start-here'].includes(channel.name.toLowerCase()));
};

const publishWelcomeLanding = async (guild: import('discord.js').Guild) => {
  const channel = findWelcomeChannel(guild);
  if (!channel) { console.warn('GuildNest welcome channel not found in ' + guild.name); return; }
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = recent?.find((message) => message.author.id === client.user?.id && message.embeds.some((embed) => (embed.title === '👋 Official Welcome' || embed.title === 'GuildNest · Official Welcome')));
  if (existing) {
    await existing.edit({ embeds: [guildNestWelcomeEmbed()] });
    console.log('Updated GuildNest welcome page in #' + channel.name);
  } else {
    await channel.send({ embeds: [guildNestWelcomeEmbed()] });
    console.log('Published GuildNest welcome page in #' + channel.name);
  }
};

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const role = member.guild.roles.cache.find((item) => item.name.toLowerCase() === 'community member');
    const botMember = member.guild.members.me;
    if (role && botMember?.permissions.has(PermissionFlagsBits.ManageRoles) && role.position < botMember.roles.highest.position) {
      await member.roles.add(role, 'GuildNest automatic new-member role');
    } else {
      console.warn('Could not assign Community Member in ' + member.guild.name + '; verify the role, Manage Roles permission, and role hierarchy.');
    }
    const channel = findWelcomeChannel(member.guild);
    if (channel) await channel.send({ content: '👋 Welcome <@' + member.id + '>!', embeds: [guildNestWelcomeEmbed(member, member.guild)] });
    else console.warn('Could not send GuildNest join welcome: no #welcome channel in ' + member.guild.name);
  } catch (error) { console.error('GuildNest join automation failed for ' + member.user.tag + ':', error); }
});

client.once(Events.ClientReady, (readyClient) => {
  readyClient.user.setPresence({
    status: 'online',
    activities: [{ name: 'GuildNest | /help', type: ActivityType.Watching }],
  });
  console.log(`NestMate is online as ${readyClient.user.tag} with presence enabled.`);
  for (const guild of readyClient.guilds.cache.values()) {
    publishWelcomeLanding(guild).catch((error) => console.error('Welcome landing publish failed:', error));
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error.message);
});

client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
  console.warn(`Discord Gateway shard ${shardId} disconnected (code ${closeEvent.code}). discord.js will manage reconnection.`);
});

client.on(Events.ShardReconnecting, (shardId) => {
  console.warn(`Discord Gateway shard ${shardId} is reconnecting.`);
});

client.on(Events.ShardResume, (replayedEvents, shardId) => {
  console.log(`Discord Gateway shard ${shardId} resumed; replayed ${replayedEvents} event(s).`);
});

client.on(Events.ShardError, (error, shardId) => {
  console.error(`Discord Gateway shard ${shardId} error:`, error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'help') {
        await interaction.reply({
          content: "**NestMate · GuildNest**\n\n/help — show this help\n/module — view module status\n/setup — build the starter layout and support panel\n/remodel-preview — preview the full official GuildNest layout\n/remodel-apply — build the official GuildNest layout without deleting existing channels\n/staff-center — create and secure the private Staff Center\n/sync — check and safely restore missing configured items\n/ticket-panel — post a support panel in a chosen category\n/community-panel — post Reports, Bug Reports, Suggestions, Feedback, and Support forms\n/welcome-panel — publish the official welcome guide\n/rules-panel — publish the rules acknowledgement panel\n/post-update — publish an announcement to #updates\n\nGuildNest is being built in stages.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'about-me') {
        await interaction.showModal(aboutMeModal());
        return;
      }

      if (interaction.commandName === 'welcome-panel') {
        const guild = interaction.guild;
        if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Run this in your server with Manage Server permission.', flags: MessageFlags.Ephemeral });
          return;
        }
        const welcomeChannel = interaction.channel;
        if (!welcomeChannel || !('messages' in welcomeChannel) || !('send' in welcomeChannel)) {
          await interaction.reply({ content: 'Run this command in a server text channel.', flags: MessageFlags.Ephemeral });
          return;
        }
        const welcomeMessages = await welcomeChannel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingWelcome = welcomeMessages?.find((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === '👋 Official Welcome'));
        if (existingWelcome) await existingWelcome.edit({ embeds: [guildNestWelcomeEmbed(undefined, guild)] });
        else await welcomeChannel.send({ embeds: [guildNestWelcomeEmbed(undefined, guild)] });
        await interaction.reply({ content: existingWelcome ? '✅ Existing official welcome guide updated.' : '✅ Official welcome guide posted in this channel.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.commandName === 'rules-panel') {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'Run this inside your server.', flags: MessageFlags.Ephemeral });
          return;
        }
        const rulesChannel = findNamedTextChannel(guild, undefined, ['rules-and-guidelines', 'rules']) ?? (interaction.channel?.type === ChannelType.GuildText ? interaction.channel : undefined);
        if (!rulesChannel) {
          await interaction.reply({ content: 'Create a #rules-and-guidelines channel first, then run /rules-panel again.', flags: MessageFlags.Ephemeral });
          return;
        }
        const rulesEmbed = new EmbedBuilder().setColor(0xFF8A3D).setTitle('📜 GuildNest Community Rules')
          .setDescription([
            '**1. Be respectful.** Treat members and staff with courtesy. Harassment, hate speech, and personal attacks are not allowed.',
            '**2. Keep it appropriate.** No explicit, illegal, dangerous, or otherwise prohibited content.',
            '**3. No spam or advertising.** Do not flood channels, send unsolicited promotions, or misuse mentions.',
            '**4. Protect privacy.** Do not share personal information, private messages, or account details without permission.',
            '**5. Use the right channels.** Keep discussions, support requests, reports, suggestions, and feedback in their intended places.',
            '**6. Follow staff directions.** Cooperate with moderators and use the report form if you have a concern about moderation.',
            '**7. Be honest and constructive.** Do not abuse forms, votes, tickets, or community features.',
            '',
            'By pressing **I Agree**, you confirm that you have read and will follow these rules. Staff may update these guidelines when needed.',
          ].join('\n\n'))
          .setFooter({ text: 'GuildNest · Community Standards' });
        const rulesRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('guildnest:rules:acknowledge').setLabel('I Agree — I have read the rules').setEmoji('✅').setStyle(ButtonStyle.Success),
        );
        const recentRules = await rulesChannel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingRules = recentRules?.find((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === '📜 GuildNest Community Rules'));
        if (existingRules) await existingRules.edit({ embeds: [rulesEmbed], components: [rulesRow] });
        else await rulesChannel.send({ embeds: [rulesEmbed], components: [rulesRow] });
        await interaction.reply({ content: (existingRules ? '✅ Existing rules panel updated in ' : '✅ Rules panel posted in ') + '<#' + rulesChannel.id + '>.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.commandName === 'post-update') {
        const guild = interaction.guild;
        if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Run this in your server with Manage Server permission.', flags: MessageFlags.Ephemeral });
          return;
        }
        const title = interaction.options.getString('title', true).trim();
        const details = interaction.options.getString('message', true).trim();
        const destination = findNamedTextChannel(guild, updatesChannelId, ['changelog', 'announcements', 'updates', 'guildnest-updates', 'bot-updates']);
        if (!destination) {
          await interaction.reply({ content: 'I could not find #updates. Run /setup or create #updates, then try again. You can also set UPDATES_CHANNEL_ID in Render.', flags: MessageFlags.Ephemeral });
          return;
        }
        await destination.send({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle(title.slice(0, 256)).setDescription(details.slice(0, 4000)).addFields({ name: 'Posted by', value: '<@' + interaction.user.id + '>' }).setTimestamp().setFooter({ text: 'GuildNest official update' })] });
        await interaction.reply({ content: '✅ Update published in <#' + destination.id + '>.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.commandName === 'module') {
        await interaction.reply({
          embeds: [moduleOverviewEmbed()],
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleMenu())],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'remodel-preview') {
        const guild = interaction.guild;
        if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Run this in your server with Manage Server permission.', flags: MessageFlags.Ephemeral });
          return;
        }
        await guild.channels.fetch();
        await guild.roles.fetch();
        const layout = [
          { name: '01 — START HERE', channels: ['welcome', 'rules-and-guidelines', 'server-information', 'verify', 'roles'] },
          { name: '02 — OFFICIAL UPDATES', channels: ['announcements', 'changelog', 'development-updates', 'service-status', 'maintenance-notices'] },
          { name: '03 — COMMUNITY', channels: ['general-chat', 'introductions', 'showcase', 'community-media', 'suggestions'] },
          { name: '04 — SUPPORT CENTER', channels: ['support-information', 'create-a-ticket', 'community-help', 'bug-reports', 'feature-requests', 'known-issues'] },
          { name: '05 — GUILDNEST RESOURCES', channels: ['documentation', 'getting-started', 'bot-commands', 'frequently-asked-questions'] },
          { name: '06 — DEVELOPMENT', channels: ['roadmap', 'beta-testing', 'developer-discussion', 'feedback'] },
          { name: '07 — VOICE LOUNGE', channels: ['general-voice', 'support-voice', 'community-lounge'] },
          { name: '08 — STAFF HEADQUARTERS', channels: ['staff-announcements', 'staff-chat', 'ticket-management', 'moderation-logs', 'staff-reports', 'development-team'] },
        ];
        const existingNames = new Set(guild.channels.cache.map((channel) => channel.name.toLowerCase()));
        const missingCategories = layout.filter((item) => !guild.channels.cache.some((channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === item.name.toLowerCase())).map((item) => item.name);
        const missingChannels = layout.flatMap((item) => item.channels.filter((name) => !existingNames.has(name)));
        const rolesToCheck = ['Owner', 'Management', 'Manager', 'Admin', 'Administrator', 'Moderator', 'Developer', 'GuildNest Developer', 'GuildNest Moderator', 'Support Team', 'Community Member', 'GuildNest Updates'];
        const rolesPresent = rolesToCheck.filter((name) => guild.roles.cache.some((role) => role.name.toLowerCase() === name.toLowerCase()));
        const rolesMissing = ['GuildNest Developer', 'GuildNest Moderator', 'Support Team', 'Community Member', 'GuildNest Updates'].filter((name) => !guild.roles.cache.some((role) => role.name.toLowerCase() === name.toLowerCase()));
        const botMember = guild.members.me;
        const missingBotPerms = [
          [PermissionFlagsBits.ManageChannels, 'Manage Channels'],
          [PermissionFlagsBits.ManageRoles, 'Manage Roles'],
          [PermissionFlagsBits.ViewChannel, 'View Channels'],
          [PermissionFlagsBits.SendMessages, 'Send Messages'],
          [PermissionFlagsBits.ReadMessageHistory, 'Read Message History'],
        ] as const;
        const missing = missingBotPerms.filter(([permission]) => !botMember?.permissions.has(permission)).map(([, name]) => name);
        const currentChannelCount = guild.channels.cache.size;
        await interaction.reply({
          content: [
            '**GuildNest full remodel preview**',
            '',
            `Server inventory: **${currentChannelCount} channels** and **${guild.roles.cache.size} roles**.`,
            `Categories to add: **${missingCategories.length}** — ${missingCategories.join(', ') || 'none'}.`,
            `Channels to add: **${missingChannels.length}** — ${missingChannels.join(', ') || 'none'}.`,
            `Staff/member roles already present: ${rolesPresent.join(', ') || 'none detected'}.`,
            `Support roles to add if missing: ${rolesMissing.join(', ') || 'none'}.`,
            `Bot permission check: ${missing.length ? '**Missing:** ' + missing.join(', ') : '**Passed**'}.`,
            '',
            '**Permission plan:** preserve existing channel-specific overwrites; keep STAFF HEADQUARTERS private for recognized Owner, Management, Admin, Moderator, Developer, GuildNest Moderator, Support Team, and NestMate roles. Public categories remain public.',
            '',
            '**Safety:** existing channels and messages will not be deleted. Existing channels with matching names may be moved into the matching category without replacing their custom overwrites. No human members will be assigned new roles automatically.',
            '',
            missing.length ? 'NestMate cannot apply the remodel until the missing bot permissions are granted.' : 'If this plan looks right, run **/remodel-apply** to apply it.',
          ].join('\\n'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'remodel-apply') {
        const guild = interaction.guild;
        if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Run this in your server with Manage Server permission.', flags: MessageFlags.Ephemeral });
          return;
        }
        const botMember = guild.members.me;
        const required = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
        const missing = required.filter((permission) => !botMember?.permissions.has(permission));
        if (missing.length) {
          await interaction.reply({ content: 'NestMate is missing one or more required server permissions: Manage Channels, Manage Roles, View Channels, Send Messages, and Read Message History.', flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await guild.channels.fetch();
        await guild.roles.fetch();
        const layout = [
          { name: '01 — START HERE', channels: [
            ['welcome', 'Official welcome and getting-started guide.'],
            ['rules-and-guidelines', 'Official community rules and member expectations.'],
            ['server-information', 'GuildNest community information, links, and how to get started.'],
            ['verify', 'Member verification and access instructions.'],
            ['roles', 'Choose available community notification and interest roles.'],
          ] as const },
          { name: '02 — OFFICIAL UPDATES', channels: [
            ['announcements', 'Official GuildNest community announcements.'],
            ['changelog', 'Verified GuildNest releases, fixes, and product changes.'],
            ['development-updates', 'Development progress and engineering updates.'],
            ['service-status', 'Current GuildNest bot, website, and service status.'],
            ['maintenance-notices', 'Planned maintenance and service-impact notices.'],
          ] as const },
          { name: '03 — COMMUNITY', channels: [
            ['general-chat', 'General community conversation.'],
            ['introductions', 'Introduce yourself to the GuildNest community.'],
            ['showcase', 'Showcase your Discord server, setup, or GuildNest creations.'],
            ['community-media', 'Share screenshots, clips, and community media.'],
            ['suggestions', 'Submit and discuss GuildNest community suggestions.'],
          ] as const },
          { name: '04 — SUPPORT CENTER', channels: [
            ['support-information', 'How to get help and what to include in a support request.'],
            ['create-a-ticket', 'Open a private support ticket with the GuildNest team.'],
            ['community-help', 'Peer-to-peer help and general questions.'],
            ['bug-reports', 'Report reproducible bugs and unexpected behavior.'],
            ['feature-requests', 'Request and discuss potential GuildNest features.'],
            ['known-issues', 'Known problems, workarounds, and investigation status.'],
          ] as const },
          { name: '05 — GUILDNEST RESOURCES', channels: [
            ['documentation', 'Official GuildNest documentation and reference links.'],
            ['getting-started', 'Guides for setting up and using GuildNest.'],
            ['bot-commands', 'NestMate commands and usage examples.'],
            ['frequently-asked-questions', 'Answers to common GuildNest questions.'],
          ] as const },
          { name: '06 — DEVELOPMENT', channels: [
            ['roadmap', 'Planned work and product direction.'],
            ['beta-testing', 'Opt-in beta testing and pre-release feedback.'],
            ['developer-discussion', 'Technical discussion about GuildNest development.'],
            ['feedback', 'General product and community feedback.'],
          ] as const },
          { name: '07 — VOICE LOUNGE', channels: [
            ['general-voice', 'General community voice room.'],
            ['support-voice', 'Voice room for scheduled support sessions.'],
            ['community-lounge', 'Casual community voice lounge.'],
          ] as const },
          { name: '08 — STAFF HEADQUARTERS', channels: [
            ['staff-announcements', 'Private staff announcements and operational notices.'],
            ['staff-chat', 'Private staff coordination and day-to-day discussion.'],
            ['ticket-management', 'Private ticket triage and support coordination.'],
            ['moderation-logs', 'Private moderation action audit log.'],
            ['staff-reports', 'Private staff reports and escalations.'],
            ['development-team', 'Private developer coordination and release planning.'],
          ] as const },
        ];
        const created: string[] = [];
        const moved: string[] = [];
        const secured: string[] = [];
        const roleSpecs = [
          { name: 'GuildNest Developer', color: 0xD4A64A },
          { name: 'GuildNest Moderator', color: 0x3498DB },
          { name: 'Support Team', color: 0x2ECC71 },
          { name: 'Community Member', color: 0x95A5A6 },
          { name: 'GuildNest Updates', color: 0xF1C40F },
        ];
        for (const spec of roleSpecs) {
          if (!guild.roles.cache.some((role) => role.name.toLowerCase() === spec.name.toLowerCase())) {
            await guild.roles.create({ name: spec.name, color: spec.color, reason: 'GuildNest non-destructive full server remodel' });
            created.push('role @' + spec.name);
          }
        }

        const categories = new Map<string, import('discord.js').CategoryChannel>();
        for (const group of layout) {
          let category = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === group.name.toLowerCase()) as import('discord.js').CategoryChannel | undefined;
          if (!category) {
            category = await guild.channels.create({ name: group.name, type: ChannelType.GuildCategory, reason: 'GuildNest full server remodel' });
            created.push('category ' + group.name);
          }
          categories.set(group.name, category);
        }

        const staffCategory = categories.get('STAFF');
        const staffRoleNames = ['owner', 'management', 'manager', 'admin', 'administrator', 'moderator', 'developer', 'developer team', 'guildnest developer', 'guildnest moderator', 'guildnest staff', 'support team'];
        const staffRoles = guild.roles.cache.filter((role) => staffRoleNames.includes(role.name.toLowerCase()));
        const staffAllow = [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ];
        const skippedStaffRoles = new Set<string>();
        const botHighestRole = guild.members.me?.roles.highest;
        const addStaffOverwrites = async (channel: import('discord.js').GuildBasedChannel) => {
          if (!('permissionOverwrites' in channel)) return;
          // Avoid a redundant Discord API overwrite write when @everyone is
          // already explicitly denied. Existing channel-specific overwrites are
          // preserved, and Discord can reject unnecessary writes with Missing Access.
          const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
          if (!everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel)) {
            try {
              await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }, { reason: 'Secure GuildNest staff-only area' });
            } catch (error) {
              console.error(`[remodel] Failed @everyone deny for channel "${channel.name}" (${channel.id}) in category "${channel.parent?.name ?? 'none'}" (${channel.parentId ?? 'none'}):`, error);
              throw new Error(`Could not secure #${channel.name}: Discord rejected the @everyone View Channel deny. Check NestMate's Manage Roles permission and the channel/category access.`);
            }
          }
          for (const role of staffRoles.values()) {
            if (role.id === guild.roles.everyone.id) continue;
            // Discord does not let a bot manage permission overwrites for roles at
            // or above its highest role. Skip those safely and report them at the end.
            if (role.managed || !botHighestRole || role.position >= botHighestRole.position) {
              skippedStaffRoles.add(role.name);
              console.warn(`[remodel] Skipping staff role "${role.name}" (${role.id}); it is managed or not below NestMate's highest role "${botHighestRole?.name ?? 'unknown'}".`);
              continue;
            }
            try {
              await channel.permissionOverwrites.edit(role.id, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true, EmbedLinks: true, AttachFiles: true,
                ...(channel.type === ChannelType.GuildVoice ? { Connect: true, Speak: true } : {}),
              }, { reason: 'Grant approved GuildNest staff role access' });
            } catch (error) {
              // A role-specific overwrite can be inaccessible on an individual
              // channel even when the bot can access the channel itself. Keep the
              // staff area private and continue the non-destructive remodel; do
              // not fail the entire operation or weaken @everyone restrictions.
              skippedStaffRoles.add(role.name);
              console.error(`[remodel] Could not update staff role "${role.name}" (${role.id}) on channel "${channel.name}" (${channel.id}); leaving its existing overwrite unchanged. Bot highest role "${botHighestRole?.name ?? 'unknown'}" (${botHighestRole?.id ?? 'unknown'}):`, error);
              continue;
            }
          }
          // NestMate inherits its channel access from the bot role's server permissions.
          // Avoid creating a self-member overwrite, which Discord may reject.
          secured.push(channel.name);
        };

        for (const group of layout) {
          const parent = categories.get(group.name)!;
          for (const [name, topic] of group.channels) {
            const voice = ['general-voice', 'support-voice', 'community-lounge', 'staff-meetings'].includes(name);
            let channel = guild.channels.cache.find((item) => item.name.toLowerCase() === name.toLowerCase() && (voice ? item.type === ChannelType.GuildVoice : item.type === ChannelType.GuildText));
            if (!channel) {
              channel = await guild.channels.create({
                name,
                type: voice ? ChannelType.GuildVoice : ChannelType.GuildText,
                parent: parent.id,
                ...(voice ? {} : { topic }),
                reason: 'GuildNest full server remodel',
              });
              created.push((voice ? 'voice ' : '#') + name);
            } else if (!channel.isThread() && channel.parentId !== parent.id) {
              await channel.setParent(parent.id, { lockPermissions: false, reason: 'Organize existing channel without replacing its custom permissions' });
              moved.push('#' + name);
            }
            if (!voice && channel.type === ChannelType.GuildText && channel.topic !== topic) {
              await channel.setTopic(topic, 'Update channel description during GuildNest remodel');
            }
            if (group.name === '08 — STAFF HEADQUARTERS') await addStaffOverwrites(channel);
          }
        }

        await interaction.editReply({
          content: [
            '**GuildNest remodel applied.**',
            '',
            `Created: ${created.length ? created.join(', ') : 'nothing new was needed'}.`,
            `Reorganized existing channels: ${moved.length ? moved.join(', ') : 'none'}.`,
            `Staff areas secured: ${secured.length ? secured.join(', ') : 'none'}.`,
            '',
            'Existing channels and messages were preserved. Existing custom channel overwrites were not bulk-replaced. NestMate created missing support/moderation/member roles but did not assign them to people.',
            '',
            'Next: assign trusted people to the appropriate staff roles, then run **/remodel-preview** again to audit the updated server.',
          ].join('\\n'),
        });
        return;
      }

      if (interaction.commandName === 'staff-center') {
        const guild = interaction.guild;
        if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'Run this in your server with Manage Server permission.', flags: MessageFlags.Ephemeral });
          return;
        }
        const botMember = guild.members.me;
        const required = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks];
        const missing = required.filter((permission) => !botMember?.permissions.has(permission));
        if (missing.length) {
          await interaction.reply({ content: 'NestMate needs **Manage Channels, Manage Roles, View Channels, Send Messages, Read Message History, and Embed Links** to build the private Staff Center.', flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const moderatorRole = guild.roles.cache.find((role) => role.name.toLowerCase() === 'guildnest moderator')
          ?? await guild.roles.create({ name: 'GuildNest Moderator', color: 0x3498DB, reason: 'GuildNest private Staff Center access' });
        const supportRole = guild.roles.cache.find((role) => role.name.toLowerCase() === 'support team')
          ?? await guild.roles.create({ name: 'Support Team', color: 0x2ECC71, reason: 'GuildNest private Staff Center access' });

        const overwrites: OverwriteResolvable[] = [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: moderatorRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          { id: supportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        ];
        if (botMember) {
          overwrites.push({ id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] });
        }

        const existingStaffCategory = guild.channels.cache.find((channel): channel is import('discord.js').CategoryChannel => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === 'staff');
        const staffCategory = existingStaffCategory ?? await guild.channels.create({ name: 'STAFF', type: ChannelType.GuildCategory, permissionOverwrites: overwrites, reason: 'Create private GuildNest Staff Center' });
        if (existingStaffCategory) {
          // Preserve custom access already configured on the existing category.
          await existingStaffCategory.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }, 'Secure GuildNest Staff Center');
          await existingStaffCategory.permissionOverwrites.edit(moderatorRole.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, EmbedLinks: true, AttachFiles: true, Connect: true, Speak: true }, 'Grant GuildNest Moderator access');
          await existingStaffCategory.permissionOverwrites.edit(supportRole.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, EmbedLinks: true, AttachFiles: true, Connect: true, Speak: true }, 'Grant Support Team access');
          if (botMember) await existingStaffCategory.permissionOverwrites.edit(botMember.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, ManageChannels: true, ManageMessages: true, EmbedLinks: true, AttachFiles: true, Connect: true, Speak: true }, 'Allow NestMate to manage Staff Center');
        }

        const created: string[] = [];
        const secured: string[] = [];
        const textChannels = [
          ['staff-chat', 'Private staff coordination and day-to-day discussion.'],
          ['staff-announcements', 'Internal staff announcements and operational notices.'],
          ['staff-reports', 'Private staff reports and escalations.'],
          ['staff-resources', 'Staff guides, procedures, and reference material.'],
          ['ticket-logs', 'Private ticket lifecycle logs and future transcript archive.'],
          ['moderation-logs', 'Private moderation action audit log.'],
          ['server-logs', 'Private server and configuration event log.'],
          ['message-logs', 'Private message event log; message content logging is not enabled by this setup.'],
        ] as const;

        for (const [name, topic] of textChannels) {
          let channel = guild.channels.cache.find((item) => item.type === ChannelType.GuildText && item.name.toLowerCase() === name) as import('discord.js').TextChannel | undefined;
          if (!channel) {
            channel = await guild.channels.create({ name, type: ChannelType.GuildText, parent: staffCategory.id, topic, reason: 'Create private GuildNest Staff Center channel' });
            created.push('#' + name);
          } else {
            await channel.setParent(staffCategory.id, { lockPermissions: true, reason: 'Move and secure GuildNest Staff Center channel' });
            if (channel.topic !== topic) await channel.setTopic(topic, 'Update GuildNest Staff Center channel topic');
            secured.push('#' + name);
          }
        }

        let meetingChannel = guild.channels.cache.find((item) => item.type === ChannelType.GuildVoice && item.name.toLowerCase() === 'staff-meetings') as import('discord.js').VoiceChannel | undefined;
        if (!meetingChannel) {
          await guild.channels.create({ name: 'staff-meetings', type: ChannelType.GuildVoice, parent: staffCategory.id, reason: 'Create private GuildNest staff meeting room' });
          created.push('🔊 staff-meetings');
        } else {
          await meetingChannel.setParent(staffCategory.id, { lockPermissions: true, reason: 'Move and secure GuildNest staff meeting room' });
          secured.push('🔊 staff-meetings');
        }

        await interaction.editReply({
          content: `**GuildNest Staff Center is ready.**

**Created:** ${created.length ? created.map((item) => `• ${item}`).join('\n') : 'Nothing new was needed.'}

**Secured/moved:** ${secured.length ? secured.map((item) => `• ${item}`).join('\n') : 'No existing channels needed changes.'}

**Private access:** @everyone is denied access. GuildNest Moderator and Support Team can view the category. Assign those roles only to trusted staff.

Note: log channels are provisioned; automated moderation/message event logging and ticket transcript delivery are separate features still to be implemented.`,
        });
        return;
      }

      if (interaction.commandName === 'setup') {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'Run setup inside your Discord server.', flags: MessageFlags.Ephemeral });
          return;
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'You need Manage Server permission to run setup.', flags: MessageFlags.Ephemeral });
          return;
        }

        const botMember = guild.members.me;
        if (!botMember) {
          await interaction.reply({ content: 'I could not verify NestMate\'s server membership. Please try again in a moment.', flags: MessageFlags.Ephemeral });
          return;
        }
        const requiredPermissions = [
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ];
        const missingPermissions = requiredPermissions.filter((permission) => !botMember.permissions.has(permission));
        if (missingPermissions.length) {
          const names = missingPermissions.map((permission) => {
            if (permission === PermissionFlagsBits.ManageChannels) return 'Manage Channels';
            if (permission === PermissionFlagsBits.ManageRoles) return 'Manage Roles';
            if (permission === PermissionFlagsBits.ViewChannel) return 'View Channels';
            if (permission === PermissionFlagsBits.SendMessages) return 'Send Messages';
            if (permission === PermissionFlagsBits.ReadMessageHistory) return 'Read Message History';
            return 'Embed Links';
          });
          await interaction.reply({
            content: `NestMate cannot run setup yet. Please grant the bot these server permissions and run /setup again: **${names.join(', ')}**.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({ content: 'NestMate is setting up your server. I will report any error here.' });
        const created: string[] = [];
        const skipped: string[] = [];
        const ensureCategory = async (name: string) => {
          const found = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === name);
          if (found) { skipped.push(`category: ${name}`); return found.id; }
          const channel = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'GuildNest automatic server setup' });
          created.push(`category: ${name}`);
          return channel.id;
        };
        const ensureTextChannel = async (name: string, parent: string, topic: string) => {
          const found = guild.channels.cache.find(
            (channel): channel is import('discord.js').TextChannel =>
              channel.type === ChannelType.GuildText && channel.name === name,
          );
          if (found) { skipped.push(`#${name}`); return found; }
          const channel = await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent,
            topic,
            reason: 'GuildNest automatic server setup',
          });
          if (channel.type !== ChannelType.GuildText) {
            throw new Error(`Expected #${name} to be created as a text channel.`);
          }
          created.push(`#${name}`);
          return channel;
        };
        const ensureRole = async (name: string, color: number) => {
          const found = guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase());
          if (found) { skipped.push(`role: ${name}`); return found; }
          const role = await guild.roles.create({ name, color, reason: 'GuildNest automatic server setup' });
          created.push(`role: ${name}`);
          return role;
        };

        const infoCategory = await ensureCategory('INFORMATION');
        const communityCategory = await ensureCategory('COMMUNITY');
        const supportCategory = await ensureCategory('SUPPORT');
        await ensureTextChannel('welcome', infoCategory, 'Welcome to the community. Read the rules and introduce yourself.');
        await ensureTextChannel('rules', infoCategory, 'Community rules and expectations.');
        await ensureTextChannel('announcements', infoCategory, 'Official community announcements.');
        const updatesChannel = await ensureTextChannel('updates', infoCategory, 'GuildNest bot updates, new features, fixes, and service notices.');
        await ensureTextChannel('general', communityCategory, 'General community conversation.');
        await ensureTextChannel('introductions', communityCategory, 'Say hello and introduce yourself.');
        const ticketChannel = await ensureTextChannel('support-tickets', supportCategory, 'Open a private support ticket using the panel below.');
        await ensureRole('GuildNest Moderator', 0x3498DB);
        await ensureRole('Support Team', 0x2ECC71);
        await ensureRole('Community Member', 0x95A5A6);
        await ensureRole('GuildNest Updates', 0xF1C40F);

        const existingUpdatesPanel = await updatesChannel.messages.fetch({ limit: 20 }).then((messages) =>
          messages.some((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === 'GuildNest Updates')),
        ).catch(() => false);
        if (!existingUpdatesPanel) {
          await updatesChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle('GuildNest Updates')
              .setDescription('Follow this channel for new features, fixes, maintenance notices, and important GuildNest news.\n\nWant to receive update notifications? Ask a server administrator to assign you the **GuildNest Updates** role.')
              .setFooter({ text: 'Powered by NestMate · GuildNest' })],
          });
          created.push('#updates announcement panel');
        } else {
          skipped.push('#updates announcement panel (already exists)');
        }

        const existingPanel = await ticketChannel.messages.fetch({ limit: 20 }).then((messages) =>
          messages.some((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === 'GuildNest Support')),
        ).catch(() => false);
        if (!existingPanel) {
          await ticketChannel.send({
            embeds: [new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('GuildNest Support')
              .setDescription('Need help from the team? Press the button below to open a private support ticket. Please create one ticket per issue.')
              .setFooter({ text: 'Powered by NestMate · GuildNest' })],
            components: [ticketPanelRow()],
          });
          created.push('support ticket panel');
        } else {
          skipped.push('support ticket panel (already exists)');
        }

        await interaction.editReply({
          content: `**GuildNest setup finished.**\n\n**Created:** ${created.length ? created.map((item) => `• ${item}`).join('\n') : 'Nothing new was needed.'}\n\n**Already existed:** ${skipped.length ? skipped.map((item) => `• ${item}`).join('\n') : 'None'}\n\nNo existing channels or roles were deleted. For private ticket creation, make sure NestMate has **Manage Channels**, **View Channels**, **Send Messages**, **Read Message History**, and **Embed Links** permissions.`,
        });
        return;
      }

      if (interaction.commandName === 'sync') {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({ content: 'Run /sync inside your Discord server.', flags: MessageFlags.Ephemeral });
          return;
        }
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({ content: 'You need Manage Server permission to run /sync.', flags: MessageFlags.Ephemeral });
          return;
        }

        const expectedCategories = ['INFORMATION', 'COMMUNITY', 'SUPPORT'];
        const expectedChannels = [
          { name: 'welcome', category: 'INFORMATION', topic: 'Welcome to the community. Read the rules and introduce yourself.' },
          { name: 'rules', category: 'INFORMATION', topic: 'Community rules and expectations.' },
          { name: 'announcements', category: 'INFORMATION', topic: 'Official community announcements.' },
          { name: 'updates', category: 'INFORMATION', topic: 'GuildNest bot updates, new features, fixes, and service notices.' },
          { name: 'general', category: 'COMMUNITY', topic: 'General community conversation.' },
          { name: 'introductions', category: 'COMMUNITY', topic: 'Say hello and introduce yourself.' },
          { name: 'support-tickets', category: 'SUPPORT', topic: 'Open a private support ticket using the panel below.' },
        ];
        const expectedRoles = [
          { name: 'GuildNest Moderator', color: 0x3498DB },
          { name: 'Support Team', color: 0x2ECC71 },
          { name: 'Community Member', color: 0x95A5A6 },
          { name: 'GuildNest Updates', color: 0xF1C40F },
        ];
        const missingCategories = expectedCategories.filter((name) =>
          !guild.channels.cache.some((channel) => channel.type === ChannelType.GuildCategory && channel.name === name),
        );
        const missingChannels = expectedChannels.filter((item) =>
          !guild.channels.cache.some((channel) => channel.type === ChannelType.GuildText && channel.name === item.name),
        );
        const missingRoles = expectedRoles.filter((item) =>
          !guild.roles.cache.some((role) => role.name.toLowerCase() === item.name.toLowerCase()),
        );
        const missingCount = missingCategories.length + missingChannels.length + missingRoles.length;
        if (!missingCount) {
          await interaction.reply({
            content: '✅ GuildNest sync check complete. All configured starter categories, channels, and roles are present. Nothing was changed.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const summary = [
          ...missingCategories.map((name) => `• Category: ${name}`),
          ...missingChannels.map((item) => `• Channel: #${item.name}`),
          ...missingRoles.map((item) => `• Role: ${item.name}`),
        ].join('\n');
        await interaction.reply({
          content: `**GuildNest Sync Check**\nI found ${missingCount} missing configured item(s):\n${summary}\n\nNothing has been changed. Press **Restore Missing Items** to recreate only these missing GuildNest items. Existing channels and roles will not be deleted or modified.`,
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('guildnest:sync:restore').setLabel('Restore Missing Items').setEmoji('🔄').setStyle(ButtonStyle.Success),
          )],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'community-panel') {
        if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased() || !('send' in interaction.channel)) {
          await interaction.reply({ content: 'Use this command in a server text channel.', flags: MessageFlags.Ephemeral });
          return;
        }
        const guild = interaction.guild;
        const botMember = guild.members.me;
        if (botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await ensurePrivateStaffSubmissionChannels(guild);
          const communityCategory = guild.channels.cache.find((channel) =>
            channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === 'community',
          );
          const routes = [
            { name: 'bug-reports', topic: 'Submit and discuss GuildNest bug reports.' },
            { name: 'suggestions', topic: 'Community suggestions submitted through NestMate forms.' },
            { name: 'feedback', topic: 'Feedback submitted through NestMate forms.' },
          ];
          for (const route of routes) {
            const exists = guild.channels.cache.some((channel) =>
              channel.type === ChannelType.GuildText && channel.name.toLowerCase() === route.name,
            );
            if (!exists) {
              await guild.channels.create({
                name: route.name,
                type: ChannelType.GuildText,
                ...(communityCategory ? { parent: communityCategory.id } : {}),
                topic: route.topic,
                reason: 'Create missing GuildNest community submission destination',
              });
            }
          }
        }
        const panelEmbed = communityPanel();
        const image = interaction.options.getAttachment('image');
        if (image && image.contentType?.startsWith('image/')) panelEmbed.setImage(image.url);
        const recentCommunity = await interaction.channel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingCommunity = recentCommunity?.find((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === 'GuildNest Community Center'));
        const communityPayload = { embeds: [panelEmbed, suggestionPanelEmbed(), feedbackPanelEmbed()], components: [communityPanelRow(), aboutMePanelRow()] };
        if (existingCommunity) await existingCommunity.edit(communityPayload);
        else await interaction.channel.send(communityPayload);
        await interaction.reply({ content: existingCommunity ? 'GuildNest Community Center and profile panels updated.' : image ? 'GuildNest Community Center, suggestion, feedback, and About Me panels posted with your image.' : 'GuildNest Community Center, suggestion, and About Me panels posted.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.commandName === 'ticket-panel') {
        if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased() || !('send' in interaction.channel)) {
          await interaction.reply({ content: 'Use this command in a server text channel.', flags: MessageFlags.Ephemeral });
          return;
        }

        // Acknowledge immediately so Discord does not time out while the panel message is being sent.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const category = interaction.options.getChannel('category', true, [ChannelType.GuildCategory]);
        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.SendMessages) ||
            !botMember.permissions.has(PermissionFlagsBits.EmbedLinks) ||
            !botMember.permissions.has(PermissionFlagsBits.ViewChannel)) {
          await interaction.editReply('I need **View Channel**, **Send Messages**, and **Embed Links** permissions in the channel where you run this command.');
          return;
        }

        const ticketPanelEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`GuildNest Support · ${category.name}`)
          .setDescription(`Need help from the team? Press the button below to open a private support ticket. New tickets from this panel will be created under **${category.name}**.`)
          .setFooter({ text: 'Powered by NestMate · GuildNest' });
        const recentTicketPanels = await interaction.channel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingTicketPanel = recentTicketPanels?.find((message) => message.author.id === client.user?.id && message.embeds.some((embed) => embed.title === `GuildNest Support · ${category.name}`));
        if (existingTicketPanel) await existingTicketPanel.edit({ embeds: [ticketPanelEmbed], components: [ticketPanelRow(category.id)] });
        else await interaction.channel.send({ embeds: [ticketPanelEmbed], components: [ticketPanelRow(category.id)] });
        await interaction.editReply(existingTicketPanel ? '✅ Existing support ticket panel updated.' : '✅ Support ticket panel posted in this channel.');
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === 'guildnest:about-me:open') {
      await interaction.showModal(aboutMeModal());
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'guildnest:about-me:submit') {
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'Submit your About Me form inside the GuildNest server.', flags: MessageFlags.Ephemeral });
        return;
      }
      const destination = findNamedTextChannel(guild, undefined, ['introductions', 'about-me', 'introductions-and-profiles']);
      if (!destination) {
        await interaction.reply({ content: 'I could not find #introductions. Please ask a server admin to create it.', flags: MessageFlags.Ephemeral });
        return;
      }
      const displayName = interaction.fields.getTextInputValue('display-name').trim();
      const interests = interaction.fields.getTextInputValue('interests').trim();
      const about = interaction.fields.getTextInputValue('about').trim();
      const profile = new EmbedBuilder()
        .setColor(0xFF8A3D)
        .setTitle('👤 About Me · ' + displayName.slice(0, 80))
        .setDescription(about.slice(0, 1000))
        .addFields({ name: 'Interests', value: interests.slice(0, 120) }, { name: 'Discord Member', value: '<@' + interaction.user.id + '>' })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'GuildNest · Community Profile' });
      await destination.send({ embeds: [profile] });
      await interaction.reply({ content: '✅ Your About Me profile was posted in <#' + destination.id + '>.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'guildnest:rules:acknowledge') {
      await interaction.reply({ content: '✅ Thank you for confirming that you have read the GuildNest community rules.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'guildnest:module:select') {
      await interaction.update({
        embeds: [moduleDetailEmbed(interaction.values[0])],
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(moduleMenu())],
      });
      return;
    }

    if (interaction.isButton() && [
      'guildnest:community:report',
      'guildnest:community:bug',
      'guildnest:community:suggestion',
      'guildnest:community:feedback',
      'guildnest:community:support',
    ].includes(interaction.customId)) {
      const kind = interaction.customId.split(':')[2] as 'report' | 'bug' | 'suggestion' | 'feedback' | 'support';
      await interaction.showModal(communityModal(kind));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('guildnest:community:submit:')) {
      const kind = interaction.customId.split(':')[3] as 'report' | 'bug' | 'suggestion' | 'feedback' | 'support';
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'Submit this form inside the GuildNest server.', flags: MessageFlags.Ephemeral });
        return;
      }
      const config = {
        report: { id: process.env.REPORTS_CHANNEL_ID, names: ['staff-reports'], label: 'Staff Report', color: 0xED4245 },
        bug: { id: bugReportsChannelId, names: ['bug-reports', 'bugs', 'bug-reports-and-issues'], label: 'Bug Report', color: 0xED4245 },
        suggestion: { id: suggestionsChannelId, names: ['suggestions', 'feature-requests', 'ideas'], label: 'Suggestion', color: 0x57F287 },
        feedback: { id: feedbackChannelId, names: ['feedback', 'general-feedback'], label: 'General Feedback', color: 0x5865F2 },
        support: { id: process.env.SUPPORT_REQUESTS_CHANNEL_ID, names: ['staff-support'], label: 'Support Request', color: 0x3498DB },
      }[kind];
      const destination = findSubmissionChannel(guild, config.id, config.names);
      if (destination && (kind === 'report' || kind === 'support') && destination.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)) {
        await interaction.reply({ content: 'Your submission was not sent because the configured destination is visible to everyone. Please ask an administrator to make the destination staff-only and run /community-panel again.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (!destination) {
        await interaction.reply({
          content: `Your submission was not sent because I couldn't find a destination channel. Create a #${config.names[0]} channel or configure ${kind === 'report' ? 'REPORTS_CHANNEL_ID' : kind === 'bug' ? 'BUG_REPORTS_CHANNEL_ID' : kind === 'suggestion' ? 'SUGGESTIONS_CHANNEL_ID' : kind === 'support' ? 'SUPPORT_REQUESTS_CHANNEL_ID' : 'FEEDBACK_CHANNEL_ID'} in Render.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const title = interaction.fields.getTextInputValue('title').trim();
      const details = interaction.fields.getTextInputValue('details').trim();
      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(kind === 'suggestion' ? `💡 New Suggestion: ${title.slice(0, 180)}` : kind === 'feedback' ? `💬 New Feedback: ${title.slice(0, 180)}` : kind === 'report' ? `🚩 Staff Report: ${title.slice(0, 180)}` : kind === 'bug' ? `🐛 Bug Report: ${title.slice(0, 180)}` : `🆘 Support Request: ${title.slice(0, 180)}`)
        .setDescription(details.slice(0, 4000))
        .addFields(
          { name: 'Submitted by', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: 'Status', value: '🟡 New', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `GuildNest submission · ${kind}` });
      const components = kind === 'suggestion'
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('guildnest:community:vote').setLabel('Vote for this idea').setEmoji('👍').setStyle(ButtonStyle.Success),
          )]
        : [];
      await destination.send({ embeds: [embed], components });
      await interaction.reply({ content: `Your ${config.label.toLowerCase()} was sent to <#${destination.id}>. Thank you!`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'guildnest:community:vote') {
      const message = interaction.message;
      const embed = message.embeds[0];
      if (!embed) {
        await interaction.reply({ content: 'This suggestion is unavailable.', flags: MessageFlags.Ephemeral });
        return;
      }
      const thumbsUpReaction = message.reactions.cache.find((reaction) => reaction.emoji.name === '👍');
      const voters = thumbsUpReaction ? await thumbsUpReaction.users.fetch().catch(() => null) : null;
      if (voters?.has(interaction.user.id)) {
        await interaction.reply({ content: 'You have already voted on this suggestion.', flags: MessageFlags.Ephemeral });
        return;
      }
      await message.react('👍');
      await interaction.reply({ content: 'Your vote has been recorded.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isButton() && interaction.customId === 'guildnest:sync:restore') {
      const guild = interaction.guild;
      if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'Only a server manager can restore GuildNest items.', flags: MessageFlags.Ephemeral });
        return;
      }
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels) || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: 'I need Manage Channels and Manage Roles permissions before I can restore missing items.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      const created: string[] = [];
      const findCategory = (name: string) => guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === name);
      const ensureCategory = async (name: string) => {
        const existing = findCategory(name);
        if (existing) return existing;
        const createdChannel = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'GuildNest safe sync restoration' });
        created.push(`category ${name}`);
        return createdChannel;
      };
      const categoryInfo = await ensureCategory('INFORMATION');
      const categoryCommunity = await ensureCategory('COMMUNITY');
      const categorySupport = await ensureCategory('SUPPORT');
      const categoryByName: Record<string, string> = {
        INFORMATION: categoryInfo.id,
        COMMUNITY: categoryCommunity.id,
        SUPPORT: categorySupport.id,
      };
      const channelsToRestore = [
        { name: 'welcome', category: 'INFORMATION', topic: 'Welcome to the community. Read the rules and introduce yourself.' },
        { name: 'rules', category: 'INFORMATION', topic: 'Community rules and expectations.' },
        { name: 'announcements', category: 'INFORMATION', topic: 'Official community announcements.' },
        { name: 'updates', category: 'INFORMATION', topic: 'GuildNest bot updates, new features, fixes, and service notices.' },
        { name: 'general', category: 'COMMUNITY', topic: 'General community conversation.' },
        { name: 'introductions', category: 'COMMUNITY', topic: 'Say hello and introduce yourself.' },
        { name: 'support-tickets', category: 'SUPPORT', topic: 'Open a private support ticket using the panel below.' },
      ];
      for (const item of channelsToRestore) {
        const exists = guild.channels.cache.some((channel) => channel.type === ChannelType.GuildText && channel.name === item.name);
        if (!exists) {
          await guild.channels.create({
            name: item.name,
            type: ChannelType.GuildText,
            parent: categoryByName[item.category],
            topic: item.topic,
            reason: 'GuildNest safe sync restoration',
          });
          created.push(`#${item.name}`);
        }
      }
      const rolesToRestore = [
        { name: 'GuildNest Moderator', color: 0x3498DB },
        { name: 'Support Team', color: 0x2ECC71 },
        { name: 'Community Member', color: 0x95A5A6 },
        { name: 'GuildNest Updates', color: 0xF1C40F },
      ];
      for (const item of rolesToRestore) {
        if (!guild.roles.cache.some((role) => role.name.toLowerCase() === item.name.toLowerCase())) {
          await guild.roles.create({ name: item.name, color: item.color, reason: 'GuildNest safe sync restoration' });
          created.push(`role ${item.name}`);
        }
      }
      await interaction.editReply({
        content: created.length
          ? `✅ **GuildNest safe sync finished.** Restored:\n${created.map((item) => `• ${item}`).join('\n')}\n\nNo existing channels or roles were deleted or changed. Run /setup if you also need to restore the support or community panels.`
          : '✅ Everything was already present; nothing needed to be restored.',
        components: [],
      });
      return;
    }

    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('guildnest:ticket:')) return;

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'Tickets can only be used inside a server.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'guildnest:ticket:create' || interaction.customId.startsWith('guildnest:ticket:create:')) {
      const selectedCategoryId = interaction.customId.split(':')[3];
      const botPermissions = [
        [PermissionFlagsBits.ManageChannels, 'Manage Channels'],
        [PermissionFlagsBits.ViewChannel, 'View Channels'],
        [PermissionFlagsBits.SendMessages, 'Send Messages'],
        [PermissionFlagsBits.ReadMessageHistory, 'Read Message History'],
        [PermissionFlagsBits.EmbedLinks, 'Embed Links'],
      ] as const;
      const missingBotPermissions = botPermissions
        .filter(([permission]) => !botMemberHasPermission(guild, permission))
        .map(([, name]) => name);
      if (missingBotPermissions.length) {
        await interaction.reply({
          content: `I can't create a private ticket yet. My effective server permissions are missing: **${missingBotPermissions.join(', ')}**. Please check my role and any channel/category permission overrides.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const existing = guild.channels.cache.find((channel) =>
        channel.type === ChannelType.GuildText &&
        channel.topic === `guildnest-ticket:${interaction.user.id}:open`,
      );
      if (existing) {
        await interaction.reply({ content: `You already have an open ticket: <#${existing.id}>`, flags: MessageFlags.Ephemeral });
        return;
      }

      const botMember = guild.members.me;
      if (!botMember) {
        await interaction.reply({ content: 'NestMate could not verify its server permissions. Please try again shortly.', flags: MessageFlags.Ephemeral });
        return;
      }

      const overwrites: OverwriteResolvable[] = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
      ];
      const staffRole = ticketStaffRoleId
        ? guild.roles.cache.get(ticketStaffRoleId)
        : guild.roles.cache.find((role) => role.name.toLowerCase() === 'support team');
      if (staffRole) {
        overwrites.push({
          id: staffRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80)}`,
        type: ChannelType.GuildText,
        topic: `guildnest-ticket:${interaction.user.id}:open`,
        ...(() => {
          const selectedCategory = selectedCategoryId
            ? guild.channels.cache.get(selectedCategoryId)
            : undefined;
          const configuredCategory = ticketCategoryId
            ? guild.channels.cache.get(ticketCategoryId)
            : undefined;
          const supportCategory = guild.channels.cache.find((item) =>
            item.type === ChannelType.GuildCategory && ['04 — support center', 'support'].includes(item.name.toLowerCase()),
          );
          const parent = selectedCategory?.type === ChannelType.GuildCategory
            ? selectedCategory
            : configuredCategory?.type === ChannelType.GuildCategory
              ? configuredCategory
              : supportCategory;
          return parent ? { parent: parent.id } : {};
        })(),
        permissionOverwrites: overwrites,
        reason: `Support ticket opened by ${interaction.user.tag}`,
      });

      await ticketChannel.send({
        content: `Welcome <@${interaction.user.id}>! Please describe what you need help with. Staff will respond here.${staffRole ? ` <@&${staffRole.id}>` : ''}`,
        embeds: [new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Support Ticket')
          .setDescription('Use **Claim ticket** when a staff member starts helping. Use **Close ticket** when the issue is resolved.')
          .addFields({ name: 'Opened by', value: `<@${interaction.user.id}>`, inline: true })
          .setTimestamp()],
        components: [ticketControls()],
      });
      await logTicketEvent(guild, ticketLogEmbed('🎫 Ticket Opened', 0x5865F2, [
        { name: 'Ticket', value: '<#' + ticketChannel.id + '>', inline: true },
        { name: 'Opened by', value: '<@' + interaction.user.id + '>', inline: true },
        { name: 'Ticket category', value: ticketChannel.parent ? '<#' + ticketChannel.parent.id + '>' : 'No category', inline: true },
      ]));
      await interaction.reply({ content: `Your private ticket is ready: <#${ticketChannel.id}>`, flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith('guildnest-ticket:')) {
      await interaction.reply({ content: 'This button only works inside a GuildNest ticket channel.', flags: MessageFlags.Ephemeral });
      return;
    }

    const [, ownerId, ticketState] = channel.topic.split(':');
    const configuredStaffRole = ticketStaffRoleId
      ? guild.roles.cache.get(ticketStaffRoleId)
      : guild.roles.cache.find((role) => role.name.toLowerCase() === 'support team');
    const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      Boolean(configuredStaffRole && interaction.member && 'roles' in interaction.member &&
        interaction.member.roles && 'cache' in interaction.member.roles &&
        interaction.member.roles.cache.has(configuredStaffRole.id));

    if (interaction.customId === 'guildnest:ticket:claim') {
      if (!isStaff) {
        await interaction.reply({ content: 'Only the support team can claim tickets.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.update({
        components: [ticketControls(true)],
      });
      await channel.send(`🙋 <@${interaction.user.id}> has claimed this ticket.`);
      await logTicketEvent(guild, ticketLogEmbed('🙋 Ticket Claimed', 0x3498DB, [
        { name: 'Ticket', value: '<#' + channel.id + '>', inline: true },
        { name: 'Claimed by', value: '<@' + interaction.user.id + '>', inline: true },
        { name: 'Owner', value: '<@' + ownerId + '>', inline: true },
      ]));
      return;
    }

    if (interaction.customId === 'guildnest:ticket:reopen') {
        if (!isStaff) {
          await interaction.reply({ content: 'Only the support team can reopen tickets.', flags: MessageFlags.Ephemeral });
          return;
        }
        if (ticketState !== 'closed') {
          await interaction.reply({ content: 'This ticket is already open.', flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.deferUpdate();
        await channel.setTopic(`guildnest-ticket:${ownerId}:open`);
        await channel.setName(`ticket-${channel.name.replace(/^closed-/, '').replace(/^ticket-/, '').slice(0, 85)}`);
        await channel.permissionOverwrites.edit(ownerId, { SendMessages: true, ViewChannel: true, ReadMessageHistory: true });
        await channel.send(`🔓 Ticket reopened by <@${interaction.user.id}>. The owner can reply here again.`);
        await interaction.editReply({ components: [ticketControls(false, false)] });
        await logTicketEvent(guild, ticketLogEmbed('🔓 Ticket Reopened', 0x2ECC71, [
          { name: 'Ticket', value: '<#' + channel.id + '>', inline: true },
          { name: 'Reopened by', value: '<@' + interaction.user.id + '>', inline: true },
          { name: 'Owner', value: '<@' + ownerId + '>', inline: true },
        ]));
        return;
    }

    if (interaction.customId === 'guildnest:ticket:close') {
      if (interaction.user.id !== ownerId && !isStaff) {
        await interaction.reply({ content: 'Only the ticket owner or support staff can close this ticket.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (ticketState === 'closed') {
        await interaction.reply({ content: 'This ticket is already closed. A support team member can reopen it.', flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferUpdate();
      await channel.setTopic(`guildnest-ticket:${ownerId}:closed`);
      await channel.setName(`closed-${channel.name.replace(/^ticket-/, '').replace(/^closed-/, '').slice(0, 85)}`);
      await channel.permissionOverwrites.edit(ownerId, { SendMessages: false, ViewChannel: true });
      await channel.send(`🔒 Ticket closed by <@${interaction.user.id}>. This ticket is kept for staff reference; support staff can reopen it using the button below.`);
      await interaction.editReply({ components: [ticketControls(false, true)] });

      await logTicketEvent(guild, ticketLogEmbed('🔒 Ticket Closed', 0xED4245, [
        { name: 'Ticket', value: '<#' + channel.id + '>', inline: true },
        { name: 'Closed by', value: '<@' + interaction.user.id + '>', inline: true },
        { name: 'Owner', value: '<@' + ownerId + '>', inline: true },
      ]));
    }
  } catch (error) {
    console.error('Interaction handler failed:', error instanceof Error ? (error.stack ?? error.message) : error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    const safeMessage = `NestMate could not finish this action. Error: ${detail.slice(0, 700)}. Check the Render logs for the full details.`;
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: safeMessage }).catch(() => undefined);
      } else {
        await interaction.reply({ content: safeMessage, flags: MessageFlags.Ephemeral }).catch(() => undefined);
      }
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
