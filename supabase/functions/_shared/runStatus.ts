import { eq } from "npm:drizzle-orm";
import { db } from "./db.ts";
import { userSettings } from "./schema.ts";

export async function markRunStarted(userId: string) {
  await db.update(userSettings).set({ runStartedAt: new Date() }).where(eq(userSettings.userId, userId));
}

export async function markRunFinished(userId: string) {
  await db
    .update(userSettings)
    .set({ runStartedAt: null, lastRunAt: new Date() })
    .where(eq(userSettings.userId, userId));
}
