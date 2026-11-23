-- GuildNest core schema. All objects are isolated in the guildnest schema.
-- This migration intentionally does not modify public or neon_auth.
CREATE SCHEMA IF NOT EXISTS guildnest;

CREATE TABLE IF NOT EXISTS guildnest.schema_migrations (
  migration_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.users (
  discord_user_id text PRIMARY KEY,
  username text NOT NULL,
  global_name text,
  avatar_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_discord_user_id text NOT NULL REFERENCES guildnest.users(discord_user_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.workspace_members (
  workspace_id uuid NOT NULL REFERENCES guildnest.workspaces(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL REFERENCES guildnest.users(discord_user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, discord_user_id)
);

CREATE TABLE IF NOT EXISTS guildnest.discord_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES guildnest.workspaces(id) ON DELETE CASCADE,
  discord_guild_id text NOT NULL UNIQUE,
  guild_name text NOT NULL,
  guild_icon_hash text,
  connected_by_discord_user_id text NOT NULL REFERENCES guildnest.users(discord_user_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('pending','connected','disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.modules (
  module_key text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  minimum_plan text NOT NULL DEFAULT 'free' CHECK (minimum_plan IN ('free','community','professional','enterprise')),
  is_core boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.workspace_modules (
  workspace_id uuid NOT NULL REFERENCES guildnest.workspaces(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES guildnest.modules(module_key) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, module_key)
);

CREATE TABLE IF NOT EXISTS guildnest.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES guildnest.workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','community','professional','enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled','incomplete')),
  billing_provider text,
  external_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guildnest.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES guildnest.workspaces(id) ON DELETE CASCADE,
  actor_discord_user_id text REFERENCES guildnest.users(discord_user_id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON guildnest.workspace_members(discord_user_id);
CREATE INDEX IF NOT EXISTS discord_connections_guild_idx ON guildnest.discord_connections(discord_guild_id);
CREATE INDEX IF NOT EXISTS workspace_modules_enabled_idx ON guildnest.workspace_modules(workspace_id, enabled);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx ON guildnest.audit_logs(workspace_id, created_at DESC);

INSERT INTO guildnest.modules (module_key, display_name, description, minimum_plan, is_core)
VALUES
 ('moderation','Moderation','Warnings, timeouts, kicks, bans, and moderation history.','free',true),
 ('tickets','Tickets','Private support tickets, claiming, closing, and transcripts.','free',true),
 ('welcome','Welcome & Verification','Member welcomes and configurable verification flows.','free',true),
 ('suggestions','Suggestions & Reports','Community suggestions and member reports.','free',true),
 ('announcements','Announcements','Publish structured announcements to connected servers.','free',true),
 ('automod','Auto Moderation','Automated moderation rules and safety controls.','community',false),
 ('analytics','Analytics','Server activity and module usage insights.','professional',false),
 ('automations','Automations','Scheduled and event-triggered workflows.','community',false)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO guildnest.schema_migrations (migration_id)
VALUES ('0001_guildnest_core')
ON CONFLICT (migration_id) DO NOTHING;
