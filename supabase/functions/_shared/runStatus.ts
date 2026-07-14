import { eq } from "npm:drizzle-orm";
import { db } from "./db.ts";
import { userSettings } from "./schema.ts";

export async function markRunStarted(userId: string) {
  await db.update(userSettings).set({ runStartedAt: new Date() }).where(eq(userSettings.userId, userId));
}

/**
 * Pass `error: null` for a successful run. A failed run keeps the previous
 * lastRunAt, so a crash doesn't burn a non-admin user's one-run-per-day
 * allowance — they can retry right away. Kept in sync with
 * src/lib/pipeline/runStatus.ts.
 */
export async function markRunFinished(userId: string, error: string | null = null) {
  await db
    .update(userSettings)
    .set(
      error === null
        ? { runStartedAt: null, lastRunAt: new Date(), lastRunError: null }
        : { runStartedAt: null, lastRunError: error },
    )
    .where(eq(userSettings.userId, userId));
}
