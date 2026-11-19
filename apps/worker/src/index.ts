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
function deferred(i: Payload, ctx: ExecutionContext, work: () => Promise<string | void>) {
  ctx.waitUntil((async () => {
    try {
      const content = await work();
      if (content !== undefined) await fetch(API + "/webhooks/" + i.application_id + "/" + i.token + "/messages/@original", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
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
  if (name === "setup" || name === "sync") return ephemeral("This setup/sync action is being ported and will be enabled before the Gateway bot is retired.");
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
    await discord(env, "PUT", "/channels/" + i.channel_id + "/messages/" + i.message.id + "/reactions/%F0%9F%91%8D/@me");
    return "Your vote has been recorded.";
  });
  if (id.startsWith("guildnest:ticket:")) return ephemeral("Ticket actions are being ported. The existing Gateway bot remains available until the full ticket workflow passes testing.");
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
