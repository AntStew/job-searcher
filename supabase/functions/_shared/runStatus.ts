import { eq } from "npm:drizzle-orm";
import { db } from "./db.ts";
import { userSettings } from "./schema.ts";

export async function markRunStarted(userId: string) {
  await db.update(userSettings).set({ runStartedAt: new Date() }).where(eq(userSettings.userId, userId));
}

/**
 * Scheduled and manual runs record success on separate columns: lastRunAt
 * drives the schedule's slot cooldown, lastManualRunAt drives the manual
 * cooldown — so a manual run can never suppress the scheduled digest and
 * vice versa. Failed runs (error != null) set neither, so neither cooldown
 * is burned by a crash; they record lastRunError for the admin page instead.
 * Kept in sync with src/lib/pipeline/runStatus.ts.
 */
export async function markRunFinished(
  userId: string,
  { scheduled, error = null }: { scheduled: boolean; error?: string | null },
) {
  const success =
    error === null
      ? scheduled
        ? { runStartedAt: null, lastRunAt: new Date(), lastRunError: null }
        : { runStartedAt: null, lastManualRunAt: new Date(), lastRunError: null }
      : { runStartedAt: null, lastRunError: error };

  await db.update(userSettings).set(success).where(eq(userSettings.userId, userId));
}
