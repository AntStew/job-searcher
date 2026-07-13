import { drizzle } from "npm:drizzle-orm/postgres-js";
import postgres from "npm:postgres";
import * as schema from "./schema.ts";

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, { prepare: false, max: 3 });

export const db = drizzle(client, { schema });
