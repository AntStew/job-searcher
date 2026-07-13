import type { userSettings } from "@/db/schema";

type Settings = typeof userSettings.$inferSelect;

const FREQUENCY_HOURS: Record<Exclude<Settings["emailFrequency"], "paused">, number> = {
  daily: 20, // slightly under 24h so a fixed daily cron time doesn't drift past a full day
  every_3_days: 3 * 24 - 4,
  weekly: 7 * 24 - 4,
};

export function isDueToday(settings: Settings, now: Date = new Date()): boolean {
  if (settings.emailFrequency === "paused") return false;
  if (!settings.lastEmailSentAt) return true;

  const hoursSinceLastSend =
    (now.getTime() - settings.lastEmailSentAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastSend >= FREQUENCY_HOURS[settings.emailFrequency];
}
