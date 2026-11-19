import nacl from "tweetnacl";

interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
}
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void }
type Payload = Record<string, any>;
const API = "https://discord.com/api/v10";
const EPHEMERAL = 64;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fromHex = (hex: string) => {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g)!.map((v) => parseInt(v, 16)));
};
function verify(body: string, signature: string | null, timestamp: string | null, key: string) {
  if (!signature || !timestamp || !key) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  try { return nacl.sign.detached.verify(new TextEncoder().encode(timestamp + body), fromHex(signature), fromHex(key)); }
  catch { return false; }
}
async function discord(env: Env, method: string, path: string, data?: unknown) {
  const r = await fetch(API + path, { method, headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN, "content-type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  if (!r.ok) throw new Error("Discord API returned " + r.status + ": " + (await r.text()).slice(0, 400));
  return r.status === 204 ? null : r.json();
}
const ephemeral = (content: string, extra: Payload = {}) => json({ type: 4, data: { content, flags: EPHEMERAL, ...extra } });
function deferred(i: Payload, ctx: ExecutionContext, work: () => Promise<string | Payload | void>) {
  ctx.waitUntil((async () => {
    try {
      const content = await work();
      if (content !== undefined) await fetch(API + "/webhooks/" + i.application_id + "/" + i.token + "/messages/@original", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(typeof content === "string" ? { content } : content) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await fetch(API + "/webhooks/" + i.application_id + "/" + i.token + "/messages/@original", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: "NestMate could not finish this action: " + message.slice(0, 600) }) }).catch(() => undefined);
      console.error("NestMate action failed", message);
    }
  })());
  return json({ type: 5, data: { flags: EPHEMERAL } });
}
const embed = (title: string, description: string, color = 0x5865f2, fields: Payload[] = []) => ({ title, description, color, fields, footer: { text: "Powered by NestMate · GuildNest" } });
const button = (id: string, label: string, style: number, emoji?: string, disabled = false) => ({ type: 2, style, custom_id: id, label, ...(emoji ? { emoji: { name: emoji } } : {}), ...(disabled ? { disabled: true } : {}) });
const ticketPanel = (category?: string) => [{ type: 1, components: [button(category ? "guildnest:ticket:create:" + category : "guildnest:ticket:create", "Open a support ticket", 1, "🎫")] }];
const ticketControls = (claimed = false, closed = false) => [{ type: 1, components: [button("guildnest:ticket:claim", claimed ? "Ticket claimed" : "Claim ticket", 2, "🙋", claimed || closed), button(closed ? "guildnest:ticket:reopen" : "guildnest:ticket:close", closed ? "Reopen ticket" : "Close ticket", closed ? 3 : 4, closed ? "🔓" : "🔒")] }];
const communityPanel = [{ type: 1, components: [button("guildnest:community:bug", "Report a Bug", 4, "🐛"), button("guildnest:community:suggestion", "Suggest an Idea", 3, "💡"), button("guildnest:community:feedback", "Send Feedback", 1, "💬")] }];
const getChannels = (env: Env, guild: string) => discord(env, "GET", "/guilds/" + guild + "/channels") as Promise<Payload[]>;
const getRoles = (env: Env, guild: string) => discord(env, "GET", "/guilds/" + guild + "/roles") as Promise<Payload[]>;
const findChannel = (list: Payload[], names: string[], id?: string) => list.find((c) => c.type === 0 && id && c.id === id) ?? list.find((c) => c.type === 0 && names.includes(String(c.name).toLowerCase()));
const send = (env: Env, channel: string, data: Payload) => discord(env, "POST", "/channels/" + channel + "/messages", data);
const hasPermission = (value: string | undefined, bit: bigint) => Boolean(value && (BigInt(value) & bit) === bit);
const option = (i: Payload, name: string) => (i.data.options ?? []).find((x: Payload) => x.name === name);
const optionValue = (i: Payload, name: string) => String(option(i, name)?.value ?? "").trim();
async function runCommand(env: Env, i: Payload, ctx: ExecutionContext): Promise<Response> {
  const name = i.data.name as string, guild = i.guild_id as string | undefined;
  if (name === "help") return ephemeral("**NestMate · GuildNest**\n\n/help — show help\n/module — view module status\n/setup — build server layout and support panel\n/sync — check and safely restore missing items\n/ticket-panel — post a support panel\n/community-panel — post community forms\n/post-update — publish an announcement");
  if (name === "module") return ephemeral("**GuildNest Modules**\n\n🟢 Core commands — online\n🟢 Support tickets — private channels, claim, close, and reopen\n🟢 Community Center — bug reports, suggestions, feedback forms, and voting\n🟢 Server setup — starter categories, channels, roles, and panels\n🟡 Applications, moderation, and dashboard controls — still being built");
  if (!guild) return ephemeral("Run this command inside your Discord server.");
  if (["setup", "sync", "ticket-panel", "community-panel", "post-update"].includes(name) && !hasPermission(i.member?.permissions, 32n)) return ephemeral("You need Manage Server permission to use this command.");
  if (name === "post-update") return deferred(i, ctx, async () => {
    const list = await getChannels(env, guild), target = findChannel(list, ["updates", "guildnest-updates", "bot-updates"], env.UPDATES_CHANNEL_ID);
    if (!target) return "I could not find #updates. Run /setup or create #updates.";
    await send(env, target.id, { embeds: [{ ...embed(optionValue(i, "title").slice(0, 256), optionValue(i, "message").slice(0, 4000), 0xf1c40f), fields: [{ name: "Posted by", value: "<@" + i.member.user.id + ">" }], timestamp: new Date().toISOString() }] });
    return "Update published in <#" + target.id + ">.";
  });
  if (name === "community-panel") return deferred(i, ctx, async () => {
    const panel = embed("GuildNest Community Center", "Choose an option below to contact the team or help improve GuildNest.", 0x5865f2, [
      { name: "🐛 Bug Reports", value: "Report errors, broken commands, or unexpected behavior.", inline: true },
      { name: "💡 Suggestions", value: "Suggest features and improvements.", inline: true },
      { name: "💬 General Feedback", value: "Share feedback about GuildNest or the community.", inline: true }
    ]);
    const image = option(i, "image")?.value;
    if (image) (panel as Payload).image = { url: image };
    await send(env, i.channel_id, { embeds: [panel], components: communityPanel });
    return "GuildNest Community Center panel posted.";
  });
  if (name === "ticket-panel") return deferred(i, ctx, async () => {
    const categoryId = option(i, "category")?.value, list = await getChannels(env, guild);
    const category = list.find((c) => c.id === categoryId && c.type === 4);
    if (!category) return "I could not find that category.";
    await send(env, i.channel_id, { embeds: [embed("GuildNest Support · " + category.name, "Press the button below to open a private support ticket. New tickets from this panel will be created under " + category.name + ".")], components: ticketPanel(category.id) });
    return "Support ticket panel posted.";
  });
  if (name === "setup") return deferred(i, ctx, async () => {
    const [list, roleList] = await Promise.all([getChannels(env, guild), getRoles(env, guild)]);
    const made: string[] = [], skipped: string[] = [];
    const category = async (n: string) => {
      const old = list.find((c) => c.type === 4 && c.name === n);
      if (old) { skipped.push("category: " + n); return old.id; }
      const item = await discord(env, "POST", "/guilds/" + guild + "/channels", { name: n, type: 4, reason: "GuildNest automatic server setup" });
      list.push(item); made.push("category: " + n); return item.id;
    };
    const channel = async (n: string, parent: string, topic: string) => {
      const old = list.find((c) => c.type === 0 && c.name === n);
      if (old) { skipped.push("#" + n); return old; }
      const item = await discord(env, "POST", "/guilds/" + guild + "/channels", { name: n, type: 0, parent_id: parent, topic, reason: "GuildNest automatic server setup" });
      list.push(item); made.push("#" + n); return item;
    };
    const role = async (n: string, color: number) => {
      const old = roleList.find((r) => r.name.toLowerCase() === n.toLowerCase());
      if (old) { skipped.push("role: " + n); return old; }
      const item = await discord(env, "POST", "/guilds/" + guild + "/roles", { name: n, color, reason: "GuildNest automatic server setup" });
      roleList.push(item); made.push("role: " + n); return item;
    };
    const info = await category("INFORMATION"), community = await category("COMMUNITY"), support = await category("SUPPORT");
    await channel("welcome", info, "Welcome to the community. Read the rules and introduce yourself.");
    await channel("rules", info, "Community rules and expectations.");
    await channel("announcements", info, "Official community announcements.");
    const updates = await channel("updates", info, "GuildNest bot updates, new features, fixes, and service notices.");
    await channel("general", community, "General community conversation.");
    await channel("introductions", community, "Say hello and introduce yourself.");
    const tickets = await channel("support-tickets", support, "Open a private support ticket using the panel below.");
    await role("GuildNest Moderator", 0x3498db);
    await role("Support Team", 0x2ecc71);
    await role("Community Member", 0x95a5a6);
    await role("GuildNest Updates", 0xf1c40f);
    const recent = await discord(env, "GET", "/channels/" + updates.id + "/messages?limit=20") as Payload[];
    if (!recent.some((m) => m.author?.bot && m.embeds?.some((e: Payload) => e.title === "GuildNest Updates"))) {
      await send(env, updates.id, { embeds: [embed("GuildNest Updates", "Follow this channel for new features, fixes, maintenance notices, and important GuildNest news. Ask an administrator for the GuildNest Updates role to receive notifications.", 0xf1c40f)] });
      made.push("#updates announcement panel");
    } else skipped.push("#updates announcement panel (already exists)");
    const ticketRecent = await discord(env, "GET", "/channels/" + tickets.id + "/messages?limit=20") as Payload[];
    if (!ticketRecent.some((m) => m.author?.bot && m.embeds?.some((e: Payload) => e.title === "GuildNest Support"))) {
      await send(env, tickets.id, { embeds: [embed("GuildNest Support", "Need help from the team? Press the button below to open a private support ticket. Please create one ticket per issue.")], components: ticketPanel() });
      made.push("support ticket panel");
    } else skipped.push("support ticket panel (already exists)");
    return "**GuildNest setup finished.**\n\n**Created:** " + (made.length ? made.map((x) => "• " + x).join("\n") : "Nothing new was needed.") + "\n\n**Already existed:** " + (skipped.length ? skipped.map((x) => "• " + x).join("\n") : "None") + "\n\nNo existing channels or roles were deleted.";
  });
  if (name === "sync") return deferred(i, ctx, async () => {
    const [list, roleList] = await Promise.all([getChannels(env, guild), getRoles(env, guild)]);
    const cats = ["INFORMATION", "COMMUNITY", "SUPPORT"];
    const channelsExpected = ["welcome", "rules", "announcements", "updates", "general", "introductions", "support-tickets"];
    const rolesExpected = ["GuildNest Moderator", "Support Team", "Community Member", "GuildNest Updates"];
    const missing = [
      ...cats.filter((n) => !list.some((c) => c.type === 4 && c.name === n)).map((n) => "• Category: " + n),
      ...channelsExpected.filter((n) => !list.some((c) => c.type === 0 && c.name === n)).map((n) => "• Channel: #" + n),
      ...rolesExpected.filter((n) => !roleList.some((r) => r.name.toLowerCase() === n.toLowerCase())).map((n) => "• Role: " + n)
    ];
    if (!missing.length) return "GuildNest sync check complete. All configured starter categories, channels, and roles are present. Nothing was changed.";
    return { content: "**GuildNest Sync Check**\nI found " + missing.length + " missing configured item(s):\n" + missing.join("\n") + "\n\nNothing has been changed. Press Restore Missing Items to recreate only these missing items.", components: [{ type: 1, components: [button("guildnest:sync:restore", "Restore Missing Items", 3, "🔄")] }] };
  });
  return ephemeral("Unknown command.");
}
async function runComponent(env: Env, i: Payload, ctx: ExecutionContext): Promise<Response> {
  const id = String(i.data.custom_id ?? ""), guild = i.guild_id as string | undefined;
  if (["guildnest:community:bug", "guildnest:community:suggestion", "guildnest:community:feedback"].includes(id)) {
    const kind = id.split(":")[2];
    const labels: Payload = { bug: ["Submit a Bug Report", "What went wrong?", "Steps to reproduce, error message, expected result..."], suggestion: ["Submit a Suggestion", "What would you like to see?", "Describe your idea and why it would help..."], feedback: ["Send General Feedback", "Tell us what you think", "Share your feedback..."] };
    const v = labels[kind];
    return json({ type: 9, data: { custom_id: "guildnest:community:submit:" + kind, title: v[0], components: [
      { type: 1, components: [{ type: 4, custom_id: "title", label: "Title", style: 1, max_length: 100, required: true, placeholder: v[1] }] },
      { type: 1, components: [{ type: 4, custom_id: "details", label: "Details", style: 2, max_length: 1800, required: true, placeholder: v[2] }] }
    ] } });
  }
  if (id.startsWith("guildnest:community:submit:")) return deferred(i, ctx, async () => {
    if (!guild) return "Submit this form inside a server.";
    const kind = id.split(":")[3], cfg: Payload = {
      bug: { id: env.BUG_REPORTS_CHANNEL_ID, names: ["bug-reports", "bugs"], label: "Bug Report", color: 0xed4245 },
      suggestion: { id: env.SUGGESTIONS_CHANNEL_ID, names: ["suggestions", "ideas"], label: "Suggestion", color: 0x57f287 },
      feedback: { id: env.FEEDBACK_CHANNEL_ID, names: ["feedback", "general-feedback"], label: "General Feedback", color: 0x5865f2 }
    }[kind];
    const list = await getChannels(env, guild), target = findChannel(list, cfg.names, cfg.id);
    if (!target) return "Could not find the submission channel. Create #" + cfg.names[0] + " or configure its channel ID.";
    const all = (i.data.components ?? []).flatMap((row: Payload) => row.components ?? []);
    const title = all.find((x: Payload) => x.custom_id === "title")?.value ?? "";
    const details = all.find((x: Payload) => x.custom_id === "details")?.value ?? "";
    const components = kind === "suggestion" ? [{ type: 1, components: [button("guildnest:community:vote", "Vote for this idea", 3, "👍")] }] : [];
    await send(env, target.id, { embeds: [{ ...embed(cfg.label + ": " + String(title).slice(0, 220), String(details).slice(0, 4000), cfg.color, [{ name: "Submitted by", value: "<@" + i.member.user.id + ">" }, { name: "Status", value: "🟡 New" }]), timestamp: new Date().toISOString() }], components });
    return "Your " + cfg.label.toLowerCase() + " was sent to <#" + target.id + ">.";
  });
  if (id === "guildnest:community:vote") return deferred(i, ctx, async () => {
    const voters = await discord(env, "GET", "/channels/" + i.channel_id + "/messages/" + i.message.id + "/reactions/%F0%9F%91%8D?limit=100") as Payload[];
    if (voters.some((user) => user.id === i.member.user.id)) return "You have already voted on this suggestion.";
    await discord(env, "PUT", "/channels/" + i.channel_id + "/messages/" + i.message.id + "/reactions/%F0%9F%91%8D/@me");
    return "Your vote has been recorded.";
  });
  if (id === "guildnest:sync:restore") return deferred(i, ctx, async () => {
    if (!guild || !hasPermission(i.member?.permissions, 32n)) return "Only a server manager can restore GuildNest items.";
    const [list, roleList] = await Promise.all([getChannels(env, guild), getRoles(env, guild)]);
    const made: string[] = [];
    const ensureCategory = async (name: string) => {
      const old = list.find((c) => c.type === 4 && c.name === name);
      if (old) return old.id;
      const created = await discord(env, "POST", "/guilds/" + guild + "/channels", { name, type: 4, reason: "GuildNest safe sync restoration" });
      list.push(created); made.push("category " + name); return created.id;
    };
    const info = await ensureCategory("INFORMATION"), community = await ensureCategory("COMMUNITY"), support = await ensureCategory("SUPPORT");
    const parents: Payload = { INFORMATION: info, COMMUNITY: community, SUPPORT: support };
    const expected = [
      ["welcome", "INFORMATION", "Welcome to the community. Read the rules and introduce yourself."],
      ["rules", "INFORMATION", "Community rules and expectations."],
      ["announcements", "INFORMATION", "Official community announcements."],
      ["updates", "INFORMATION", "GuildNest bot updates, new features, fixes, and service notices."],
      ["general", "COMMUNITY", "General community conversation."],
      ["introductions", "COMMUNITY", "Say hello and introduce yourself."],
      ["support-tickets", "SUPPORT", "Open a private support ticket using the panel below."]
    ];
    for (const [name, category, topic] of expected) {
      if (!list.some((c) => c.type === 0 && c.name === name)) {
        await discord(env, "POST", "/guilds/" + guild + "/channels", { name, type: 0, parent_id: parents[category], topic, reason: "GuildNest safe sync restoration" });
        made.push("#" + name);
      }
    }
    const expectedRoles: [string, number][] = [["GuildNest Moderator", 0x3498db], ["Support Team", 0x2ecc71], ["Community Member", 0x95a5a6], ["GuildNest Updates", 0xf1c40f]];
    for (const [name, color] of expectedRoles) {
      if (!roleList.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
        await discord(env, "POST", "/guilds/" + guild + "/roles", { name, color, reason: "GuildNest safe sync restoration" });
        made.push("role " + name);
      }
    }
    return made.length ? "GuildNest safe sync finished. Restored:\n" + made.map((x) => "• " + x).join("\n") + "\n\nNo existing channels or roles were deleted or changed." : "Everything was already present; nothing needed to be restored.";
  });
  if (id.startsWith("guildnest:ticket:")) return deferred(i, ctx, async () => {
    if (!guild) return "Tickets can only be used inside a server.";
    const channelId = i.channel_id as string;
    if (id.startsWith("guildnest:ticket:create")) {
      const [list, roleList] = await Promise.all([getChannels(env, guild), getRoles(env, guild)]);
      const userId = i.member.user.id, username = i.member.user.username ?? "member";
      const existing = list.find((c) => c.type === 0 && c.topic === "guildnest-ticket:" + userId + ":open");
      if (existing) return "You already have an open ticket: <#" + existing.id + ">.";
      const staff = env.TICKET_STAFF_ROLE_ID ? roleList.find((r) => r.id === env.TICKET_STAFF_ROLE_ID) : roleList.find((r) => r.name.toLowerCase() === "support team");
      const requestedCategory = id.split(":")[3];
      const parent = list.find((c) => c.id === requestedCategory && c.type === 4) ?? list.find((c) => c.id === env.TICKET_CATEGORY_ID && c.type === 4) ?? list.find((c) => c.type === 4 && c.name.toLowerCase() === "support");
      const view = 1024n, sendPermission = 2048n, history = 65536n, attach = 32768n, embeds = 16384n, manageChannels = 16n;
      const overwrites = [
        { id: guild, type: 0, deny: String(view) },
        { id: userId, type: 1, allow: String(view | sendPermission | history | attach | embeds) },
        { id: env.DISCORD_APPLICATION_ID, type: 1, allow: String(view | sendPermission | history | manageChannels) },
        ...(staff ? [{ id: staff.id, type: 0, allow: String(view | sendPermission | history) }] : [])
      ];
      const ticket = await discord(env, "POST", "/guilds/" + guild + "/channels", {
        name: "ticket-" + username.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80),
        type: 0, topic: "guildnest-ticket:" + userId + ":open", ...(parent ? { parent_id: parent.id } : {}),
        permission_overwrites: overwrites, reason: "GuildNest support ticket opened by " + username
      });
      await send(env, ticket.id, {
        content: "Welcome <@" + userId + ">! Please describe what you need help with. Staff will respond here." + (staff ? " <@&" + staff.id + ">" : ""),
        embeds: [embed("Support Ticket", "Use Claim ticket when a staff member starts helping. Use Close ticket when the issue is resolved.", 0x5865f2, [{ name: "Opened by", value: "<@" + userId + ">", inline: true }])],
        components: ticketControls()
      });
      if (env.TICKET_LOG_CHANNEL_ID) await send(env, env.TICKET_LOG_CHANNEL_ID, { embeds: [embed("🎫 Ticket Opened", "Ticket <#" + ticket.id + "> opened by <@" + userId + ">.", 0x5865f2)] });
      return "Your private ticket is ready: <#" + ticket.id + ">.";
    }
    const channel = await discord(env, "GET", "/channels/" + channelId) as Payload;
    if (!String(channel.topic ?? "").startsWith("guildnest-ticket:")) return "This button only works inside a GuildNest ticket channel.";
    const parts = String(channel.topic).split(":"), ownerId = parts[1], state = parts[2];
    const roleList = await getRoles(env, guild);
    const staff = env.TICKET_STAFF_ROLE_ID ? roleList.find((r) => r.id === env.TICKET_STAFF_ROLE_ID) : roleList.find((r) => r.name.toLowerCase() === "support team");
    const isStaff = hasPermission(i.member?.permissions, 16n) || hasPermission(i.member?.permissions, 32n) || Boolean(staff && (i.member?.roles ?? []).includes(staff.id));
    if (id.endsWith(":claim")) {
      if (!isStaff) return "Only the support team can claim tickets.";
      await discord(env, "PATCH", "/channels/" + channelId + "/messages/" + i.message.id, { components: ticketControls(true, false) });
      await send(env, channelId, { content: "🙋 <@" + i.member.user.id + "> has claimed this ticket." });
      return "Ticket claimed.";
    }
    if (id.endsWith(":reopen")) {
      if (!isStaff) return "Only the support team can reopen tickets.";
      if (state !== "closed") return "This ticket is already open.";
      await discord(env, "PATCH", "/channels/" + channelId, { topic: "guildnest-ticket:" + ownerId + ":open", name: "ticket-" + channel.name.replace(/^closed-/, "").replace(/^ticket-/, "").slice(0, 85) });
      await discord(env, "PUT", "/channels/" + channelId + "/permissions/" + ownerId, { type: 1, allow: String(1024n | 2048n | 65536n), deny: "0" });
      await send(env, channelId, { content: "🔓 Ticket reopened by <@" + i.member.user.id + ">. The owner can reply again." });
      await discord(env, "PATCH", "/channels/" + channelId + "/messages/" + i.message.id, { components: ticketControls(false, false) });
      return "Ticket reopened.";
    }
    if (id.endsWith(":close")) {
      if (i.member.user.id !== ownerId && !isStaff) return "Only the ticket owner or support staff can close this ticket.";
      if (state === "closed") return "This ticket is already closed.";
      await discord(env, "PATCH", "/channels/" + channelId, { topic: "guildnest-ticket:" + ownerId + ":closed", name: "closed-" + channel.name.replace(/^ticket-/, "").replace(/^closed-/, "").slice(0, 85) });
      await discord(env, "PUT", "/channels/" + channelId + "/permissions/" + ownerId, { type: 1, allow: String(1024n | 65536n), deny: "2048" });
      await send(env, channelId, { content: "🔒 Ticket closed by <@" + i.member.user.id + ">. Staff can reopen it using the button below." });
      await discord(env, "PATCH", "/channels/" + channelId + "/messages/" + i.message.id, { components: ticketControls(false, true) });
      if (env.TICKET_LOG_CHANNEL_ID) await send(env, env.TICKET_LOG_CHANNEL_ID, { embeds: [embed("🔒 Ticket Closed", "Ticket <#" + channelId + "> was closed by <@" + i.member.user.id + ">.", 0xed4245)] });
      return "Ticket closed.";
    }
    return "Unknown ticket action.";
  });
  return ephemeral("Unknown interaction.");
}
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) return json({ service: "GuildNest NestMate", status: "online", mode: "discord-http-interactions" });
    if (request.method !== "POST" || url.pathname !== "/interactions") return json({ error: "Not found" }, 404);
    const body = await request.text();
    if (!verify(body, request.headers.get("X-Signature-Ed25519"), request.headers.get("X-Signature-Timestamp"), env.DISCORD_PUBLIC_KEY)) return new Response("Invalid request signature", { status: 401 });
    let interaction: Payload;
    try { interaction = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (interaction.type === 1) return json({ type: 1 });
    if (interaction.type === 2) return runCommand(env, interaction, ctx);
    if (interaction.type === 3 || interaction.type === 5) return runComponent(env, interaction, ctx);
    return ephemeral("Unsupported interaction type.");
  }
};
