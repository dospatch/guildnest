import { Pool } from 'pg';

declare global {
  // Reuse one pool across warm Next.js/Vercel invocations.
  // eslint-disable-next-line no-var
  var guildNestPool: Pool | undefined;
}

export function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured for this deployment.');
  }

  if (!globalThis.guildNestPool) {
    globalThis.guildNestPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'guildnest-web',
    });
  }

  return globalThis.guildNestPool;
}
