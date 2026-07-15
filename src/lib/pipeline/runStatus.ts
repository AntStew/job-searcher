import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

/** A run stuck "in progress" longer than this is treated as crashed, not running. */
export const STALE_RUN_MINUTES = 3;

/** Non-admins get one manual "Run now" per this window, tracked separately from the schedule. */
export const MANUAL_RUN_COOLDOWN_HOURS = 12;

export function isRunInProgress(runStartedAt: Date | null, now: Date = new Date()): boolean {
  if (!runStartedAt) return false;
  const minutesElapsed = (now.getTime() - runStartedAt.getTime()) / (1000 * 60);
  return minutesElapsed < STALE_RUN_MINUTES;
}

/** Hours until another manual run is allowed; 0 means allowed now. */
export function hoursUntilManualRunAllowed(
  lastManualRunAt: Date | null,
  now: Date = new Date(),
): number {
  if (!lastManualRunAt) return 0;
  const hoursElapsed = (now.getTime() - lastManualRunAt.getTime()) / (1000 * 60 * 60);
  return Math.max(0, MANUAL_RUN_COOLDOWN_HOURS - hoursElapsed);
}

export async function markRunStarted(userId: string) {
  await db.update(userSettings).set({ runStartedAt: new Date() }).where(eq(userSettings.userId, userId));
}

/**
 * If a prior run died without clearing the lock (client disconnect / edge kill),
 * wipe `run_started_at` so the button can recover without waiting forever.
 */
export async function clearStaleRunLock(
  userId: string,
  runStartedAt: Date | null,
  now: Date = new Date(),
): Promise<boolean> {
  if (!runStartedAt || isRunInProgress(runStartedAt, now)) return false;
  await db
    .update(userSettings)
    .set({
      runStartedAt: null,
      lastRunError: "Previous search timed out or was interrupted. Try Run now again.",
    })
    .where(eq(userSettings.userId, userId));
  return true;
}

/**
 * Scheduled and manual runs record success on separate columns: lastRunAt
 * drives the schedule's slot cooldown, lastManualRunAt drives the manual
 * cooldown — so a manual run can never suppress the scheduled digest and
 * vice versa. Failed runs (error != null) set neither, so neither cooldown
 * is burned by a crash; they record lastRunError for the admin page instead.
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
