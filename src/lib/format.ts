// Shared display formatting for the app's pages. The digest email senders
// (src/lib/email/sendDigest.ts and its Deno mirror) keep their own private
// formatSalary copy so the mirrored pair stays byte-comparable — don't import
// this module there.

/** "$90k" / "$90k – $120k", or null when no salary info. */
export function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}

/** "Jul 14" */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Jul 14, 8:05 AM", or "Never yet" for null. */
export function formatDateTime(date: Date | null): string {
  if (!date) return "Never yet";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
