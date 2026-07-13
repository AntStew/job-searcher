import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Next.js dev-mode hot reload re-evaluates this module on every file change;
// without caching the client on globalThis, each reload opens a fresh set of
// Postgres connections that never get closed, quickly exhausting the
// connection limit on Supabase's free tier.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

const client =
  globalForDb.pgClient ??
  postgres(connectionString, { prepare: false, max: 5, idle_timeout: 20 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
