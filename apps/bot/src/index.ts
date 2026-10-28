import 'dotenv/config';
import { createServer } from 'node:http';
import {
  ActionRowBuilder,
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
  PermissionFlagsBits,
  type OverwriteResolvable,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error('Missing DISCORD_BOT_TOKEN. Set it in the hosting environment; never commit it.');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
const ticketStaffRoleId = process.env.TICKET_STAFF_ROLE_ID;
const ticketLogChannelId = process.env.TICKET_LOG_CHANNEL_ID;
const bugReportsChannelId = process.env.BUG_REPORTS_CHANNEL_ID;
const suggestionsChannelId = process.env.SUGGESTIONS_CHANNEL_ID;
const feedbackChannelId = process.env.FEEDBACK_CHANNEL_ID;

const communityPanel = () => new EmbedBuilder()
  .setColor(0x5865F2)
  .setTitle('GuildNest Community Center')
  .setDescription('Choose an option below to contact the team or help improve GuildNest.')
  .addFields(
    { name: '🐛 Bug Reports', value: 'Report errors, broken commands, or unexpected behavior.', inline: true },
    { name: '💡 Suggestions', value: 'Suggest features and improvements.', inline: true },
    { name: '💬 General Feedback', value: 'Share feedback about GuildNest or the community.', inline: true },
  )
  .setFooter({ text: 'Powered by NestMate · GuildNest' });

const communityPanelRow = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId('guildnest:community:bug').setLabel('Report a Bug').setEmoji('🐛').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('guildnest:community:suggestion').setLabel('Suggest an Idea').setEmoji('💡').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('guildnest:community:feedback').setLabel('Send Feedback').setEmoji('💬').setStyle(ButtonStyle.Primary),
);

const communityModal = (kind: 'bug' | 'suggestion' | 'feedback') => {
  const labels = {
    bug: { title: 'Submit a Bug Report', description: 'What went wrong?', placeholder: 'Steps to reproduce, error message, expected result...' },
    suggestion: { title: 'Submit a Suggestion', description: 'What would you like to see?', placeholder: 'Describe your idea and why it would help...' },
    feedback: { title: 'Send General Feedback', description: 'Tell us what you think', placeholder: 'Share your feedback...' },
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

const findSubmissionChannel = (guild: import('discord.js').Guild, configuredId: string | undefined, names: string[]) => {
  const configured = configuredId ? guild.channels.cache.get(configuredId) : undefined;
  if (configured?.isTextBased() && 'send' in configured) return configured;
  return guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && names.includes(channel.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')));
};

const botMemberHasPermission = (guild: import('discord.js').Guild, permission: bigint) =>
  Boolean(guild.members.me?.permissions.has(permission));

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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`NestMate is online as ${readyClient.user.tag}.`);
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error.message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'help') {
        await interaction.reply({
          content: '**NestMate · GuildNest**\n\n`/help` — show this help\n`/module` — view module status\n`/setup` — build the server layout and support panel\n`/ticket-panel` — post a support panel in a chosen category\n`/community-panel` — post Bug Reports, Suggestions, and Feedback buttons\n\nGuildNest is being built in stages.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === 'module') {
        await interaction.reply({
          content: '**GuildNest Modules**\n\n🟢 **Core commands** — online\n🟢 **Support tickets** — panel, private channels, claim, close, and reopen\n🟢 **Community Center** — bug reports, suggestions, feedback forms, and suggestion voting\n🟢 **Server setup** — creates starter categories, channels, roles, and support panel\n🟡 **Applications, moderation, and dashboard controls** — still being built',
          flags: MessageFlags.Ephemeral,
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
            content: `NestMate cannot run setup yet. Please grant the bot these server permissions and run \`/setup\` again: **${names.join(', ')}**.`,
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
          const found = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && channel.name === name);
          if (found) { skipped.push(`#${name}`); return found; }
          const channel = await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent,
            topic,
            reason: 'GuildNest automatic server setup',
          });
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

      if (interaction.commandName === 'community-panel') {
        if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased() || !('send' in interaction.channel)) {
          await interaction.reply({ content: 'Use this command in a server text channel.', flags: MessageFlags.Ephemeral });
          return;
        }
        const panelEmbed = communityPanel();
        const image = interaction.options.getAttachment('image');
        if (image && image.contentType?.startsWith('image/')) panelEmbed.setImage(image.url);
        await interaction.channel.send({ embeds: [panelEmbed], components: [communityPanelRow()] });
        await interaction.reply({ content: image ? 'GuildNest Community Center panel posted with your image.' : 'GuildNest Community Center panel posted.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.commandName === 'ticket-panel') {
        if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased() || !('send' in interaction.channel)) {
          await interaction.reply({ content: 'Use this command in a server text channel.', flags: MessageFlags.Ephemeral });
          return;
        }
        const category = interaction.options.getChannel('category', true, [ChannelType.GuildCategory]);
        await interaction.channel.send({
          embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`GuildNest Support · ${category.name}`)
            .setDescription(`Need help from the team? Press the button below to open a private support ticket. New tickets from this panel will be created under **${category.name}**.`)
            .setFooter({ text: 'Powered by NestMate · GuildNest' })],
          components: [ticketPanelRow(category.id)],
        });
        await interaction.reply({ content: 'Support ticket panel posted in this channel.', flags: MessageFlags.Ephemeral });
        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith('guildnest:community:')) {
      const kind = interaction.customId.split(':')[2] as 'bug' | 'suggestion' | 'feedback';
      if (!['bug', 'suggestion', 'feedback'].includes(kind)) return;
      await interaction.showModal(communityModal(kind));
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('guildnest:community:submit:')) {
      const kind = interaction.customId.split(':')[3] as 'bug' | 'suggestion' | 'feedback';
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'Submit this form inside the GuildNest server.', flags: MessageFlags.Ephemeral });
        return;
      }
      const config = {
        bug: { id: bugReportsChannelId, names: ['bug-reports', 'bugs', 'bug-reports-and-issues'], label: 'Bug Report', color: 0xED4245 },
        suggestion: { id: suggestionsChannelId, names: ['suggestions', 'feature-requests', 'ideas'], label: 'Suggestion', color: 0x57F287 },
        feedback: { id: feedbackChannelId, names: ['feedback', 'general-feedback'], label: 'General Feedback', color: 0x5865F2 },
      }[kind];
      const destination = findSubmissionChannel(guild, config.id, config.names);
      if (!destination) {
        await interaction.reply({
          content: `Your submission was not sent because I couldn't find a destination channel. Create a #${config.names[0]} channel or configure ${kind === 'bug' ? 'BUG_REPORTS_CHANNEL_ID' : kind === 'suggestion' ? 'SUGGESTIONS_CHANNEL_ID' : 'FEEDBACK_CHANNEL_ID'} in Render.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const title = interaction.fields.getTextInputValue('title').trim();
      const details = interaction.fields.getTextInputValue('details').trim();
      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle(`${config.label}: ${title.slice(0, 220)}`)
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
      const alreadyVoted = message.reactions.cache.some((reaction) => reaction.emoji.name === '👍' && reaction.users.cache.has(interaction.user.id));
      if (alreadyVoted) {
        await interaction.reply({ content: 'You have already voted on this suggestion.', flags: MessageFlags.Ephemeral });
        return;
      }
      await message.react('👍');
      await interaction.reply({ content: 'Your vote has been recorded.', flags: MessageFlags.Ephemeral });
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
            item.type === ChannelType.GuildCategory && item.name.toLowerCase() === 'support',
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
        if (ticketLogChannelId) {
          const logChannel = guild.channels.cache.get(ticketLogChannelId);
          if (logChannel?.isTextBased() && 'send' in logChannel) {
            await logChannel.send(`🔓 Ticket ${channel.name} reopened by ${interaction.user.tag}. Channel: <#${channel.id}>; owner: <@${ownerId}>.`).catch(() => undefined);
          }
        }
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

      if (ticketLogChannelId) {
        const logChannel = guild.channels.cache.get(ticketLogChannelId);
        if (logChannel?.isTextBased() && 'send' in logChannel) {
          await logChannel.send(`🔒 Ticket ${channel.name} closed by ${interaction.user.tag}. Channel: <#${channel.id}>; owner: <@${ownerId}>.`).catch(() => undefined);
        }
      }
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
