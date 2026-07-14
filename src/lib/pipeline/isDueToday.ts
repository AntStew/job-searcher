import type { userSettings } from "@/db/schema";
import { getZonedParts } from "@/lib/timezone";

type Settings = typeof userSettings.$inferSelect;

/** Minimum gap since the last send before the same slot can fire again, guarding against duplicate sends within one scheduled hour. */
const MIN_GAP_HOURS: Record<Exclude<Settings["emailFrequency"], "paused">, number> = {
  daily: 20,
  weekly: 6 * 24,
  monthly: 27 * 24,
};

/**
 * True if `now` (in the user's chosen timezone) matches their scheduled
 * hour/day for their chosen frequency, and enough time has passed since
 * their last email to avoid re-sending within the same slot. Called by the
 * hourly cron, so this needs to line up with exactly one hour per period.
 */
export function isDueToday(settings: Settings, now: Date = new Date()): boolean {
  if (settings.adminLocked) return false; // extra safety net alongside emailFrequency="paused"
  if (settings.emailFrequency === "paused") return false;

  const { hour, dayOfWeek, dayOfMonth } = getZonedParts(now, settings.timezone);

  if (hour !== settings.scheduleHour) return false;
  if (settings.emailFrequency === "weekly" && dayOfWeek !== settings.scheduleDayOfWeek) return false;
  if (settings.emailFrequency === "monthly" && dayOfMonth !== settings.scheduleDayOfMonth) return false;

  if (!settings.lastEmailSentAt) return true;

  const hoursSinceLastSend =
    (now.getTime() - settings.lastEmailSentAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastSend >= MIN_GAP_HOURS[settings.emailFrequency];
}

/** The next time the cron will consider this user due, or null if paused. */
export function nextDueDate(settings: Settings, now: Date = new Date()): Date | null {
  if (settings.adminLocked) return null;
  if (settings.emailFrequency === "paused") return null;

  // Walk forward hour by hour (bounded) until isDueToday would return true,
  // without the min-gap-since-last-send guard so it reflects the schedule
  // itself rather than "when we're allowed to send again".
  const probe = { ...settings, lastEmailSentAt: null };
  const maxHoursToCheck = 24 * 32;

  for (let i = 0; i <= maxHoursToCheck; i++) {
    const candidate = new Date(now.getTime() + i * 60 * 60 * 1000);
    if (isDueToday(probe, candidate)) {
      candidate.setUTCMinutes(0, 0, 0);
      return candidate;
    }
  }

  return null;
}
