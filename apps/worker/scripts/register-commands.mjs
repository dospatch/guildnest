const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !appId) throw new Error("Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID before registering commands.");
const commands = [
  { name: "help", description: "Show NestMate commands and getting-started help." },
  { name: "module", description: "View GuildNest modules and their planned status." },
  { name: "setup", description: "Build the standard GuildNest server layout and support ticket panel.", default_member_permissions: "32" },
  { name: "sync", description: "Check for missing GuildNest channels and roles, then offer safe restoration.", default_member_permissions: "32" },
  { name: "community-panel", description: "Post the GuildNest Bug Reports, Suggestions, and Feedback panel.", options: [{ type: 11, name: "image", description: "Optional screenshot or image to display on the panel", required: false }], default_member_permissions: "32" },
  { name: "post-update", description: "Publish an official announcement to the GuildNest updates channel.", options: [
    { type: 3, name: "title", description: "Short update title", max_length: 256, required: true },
    { type: 3, name: "message", description: "Details of the update", max_length: 4000, required: true }
  ], default_member_permissions: "32" },
  { name: "ticket-panel", description: "Post a ticket panel that routes new tickets into a chosen category.", options: [
    { type: 7, name: "category", description: "Category where tickets from this panel should be created", channel_types: [4], required: true }
  ], default_member_permissions: "32" }
];
const route = guildId ? "applications/" + appId + "/guilds/" + guildId + "/commands" : "applications/" + appId + "/commands";
const result = await fetch("https://discord.com/api/v10/" + route, {
  method: "PUT",
  headers: { authorization: "Bot " + token, "content-type": "application/json" },
  body: JSON.stringify(commands)
});
if (!result.ok) throw new Error("Command registration failed (" + result.status + "): " + await result.text());
console.log("Registered " + commands.length + " GuildNest commands.");
