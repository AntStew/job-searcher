import type { userSettings } from "@/db/schema";
import { getZonedParts } from "@/lib/timezone";

type Settings = typeof userSettings.$inferSelect;

/**
 * How far past a scheduled slot a late trigger may still fire it. GitHub
 * Actions cron regularly drifts by up to an hour or skips an hour outright,
 * so a 7am slot must survive the trigger arriving at 8 or 9 — late beats
 * never.
 */
export const CATCH_UP_HOURS = 3;

/**
 * Once a scheduled run succeeds, no new scheduled run for this long.
 * Adjacent slots are at least ~20h apart even when DST compresses a day, so
 * 4h can only ever suppress re-fires of the SAME slot — including the cron
 * hitting twice within one hour and the DST fall-back hour repeating.
 */
export const SLOT_COOLDOWN_HOURS = 4;

/** True when `date`, seen in the user's timezone, is inside their scheduled hour/day. */
function matchesScheduledSlot(settings: Settings, date: Date): boolean {
  const { hour, dayOfWeek, dayOfMonth } = getZonedParts(date, settings.timezone);
  if (hour !== settings.scheduleHour) return false;
  if (settings.emailFrequency === "weekly" && dayOfWeek !== settings.scheduleDayOfWeek) return false;
  if (settings.emailFrequency === "monthly" && dayOfMonth !== settings.scheduleDayOfMonth) return false;
  return true;
}

/**
 * Should the scheduled pipeline run for this user right now?
 *
 * Due when a scheduled slot started within the last CATCH_UP_HOURS and the
 * slot hasn't been served yet. "Served" is tracked by lastRunAt, which ONLY
 * successful scheduled runs set — manual "Run now" clicks track
 * lastManualRunAt instead and can never suppress the scheduled digest. A
 * failed scheduled run doesn't set lastRunAt either, so the next trigger
 * inside the catch-up window retries automatically.
 */
export function isDueNow(settings: Settings, now: Date = new Date()): boolean {
  if (settings.adminLocked) return false; // extra safety net alongside emailFrequency="paused"
  if (settings.emailFrequency === "paused") return false;

  let slotInWindow = false;
  for (let i = 0; i <= CATCH_UP_HOURS; i++) {
    const candidate = new Date(now.getTime() - i * 60 * 60 * 1000);
    if (matchesScheduledSlot(settings, candidate)) {
      slotInWindow = true;
      break;
    }
  }
  if (!slotInWindow) return false;

  if (!settings.lastRunAt) return true;
  const hoursSinceLastRun = (now.getTime() - settings.lastRunAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun >= SLOT_COOLDOWN_HOURS;
}

/** The next scheduled slot at or after `now`, or null if paused. Display only — ignores cooldown state. */
export function nextDueDate(settings: Settings, now: Date = new Date()): Date | null {
  if (settings.adminLocked) return null;
  if (settings.emailFrequency === "paused") return null;

  const maxHoursToCheck = 24 * 32; // covers a full monthly cycle

  for (let i = 0; i <= maxHoursToCheck; i++) {
    const candidate = new Date(now.getTime() + i * 60 * 60 * 1000);
    if (matchesScheduledSlot(settings, candidate)) {
      candidate.setUTCMinutes(0, 0, 0);
      return candidate;
    }
  }

  return null;
}
