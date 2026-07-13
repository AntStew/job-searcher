import type { userSettings } from "./schema.ts";
import { getZonedParts } from "./timezone.ts";

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
