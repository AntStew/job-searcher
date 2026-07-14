import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

/** A run stuck "in progress" longer than this is treated as crashed, not running. */
export const STALE_RUN_MINUTES = 10;

export function isRunInProgress(runStartedAt: Date | null, now: Date = new Date()): boolean {
  if (!runStartedAt) return false;
  const minutesElapsed = (now.getTime() - runStartedAt.getTime()) / (1000 * 60);
  return minutesElapsed < STALE_RUN_MINUTES;
}

export async function markRunStarted(userId: string) {
  await db.update(userSettings).set({ runStartedAt: new Date() }).where(eq(userSettings.userId, userId));
}

/**
 * Pass `error: null` for a successful run. A failed run keeps the previous
 * lastRunAt, so a crash doesn't burn a non-admin user's one-run-per-day
 * allowance — they can retry right away.
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
