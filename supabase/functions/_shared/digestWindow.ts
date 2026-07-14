// Shared between sendDigest (what actually goes out) and the dashboard's
// "Ready to send" stat, so the number users see matches the email they get.
export const MAX_JOBS_PER_DIGEST = 15;

export const WINDOW_HOURS: Record<"daily" | "weekly" | "monthly", number> = {
  daily: 24,
  weekly: 7 * 24,
  monthly: 30 * 24,
};
