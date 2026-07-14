// The user's own jokes, shown on the dashboard and also fed to the search
// agent as a reference for how this person actually talks/jokes, so its
// job-match reasoning can match that voice instead of a generic tone.
export const TAUNTS = [
  "gEt a Job bRokE BuM",
  "dont throw up when you see the job applications",
  "the unemployment final boss is ... you",
  "tik tok not gunna pay the bills",
  "rent dueeeee",
  "LinkedIn a scam use this",
  "Mcdonalds dont need more employees gang",
  "OF cant save you buddy",
  "You can't be out here mopping at Wendy's",
  "Just get it over with",
  "mom said stop asking for gas money",
  "Dont make the CIA proud",
  "LLLOOOCCCKKK IIIINNNNN",
  "Just do a few it wont kill you",
  "Don't embarrass yourself in front of the huzzzz",
];

export const TAUNT_EMOJIS = ["💀", "😭", "🔥", "📉", "🫠", "🚨", "👀", "🥲", "🛋️", "💸"];

export type TauntStats = {
  totalMatches: number;
  /** Matches marked applied, interviewing, or offer. */
  appliedCount: number;
  /** Matches scored in the last 7 days. */
  newThisWeek: number;
};

/**
 * Picks the dashboard taunt. Personal stats hit harder than the generic
 * lines, so when the numbers give us something to roast, roast with them —
 * with one generic taunt mixed in so it doesn't get stale. `random` is
 * injectable for tests.
 */
export function pickTaunt(stats: TauntStats | null, random: () => number = Math.random): string {
  const pool: string[] = [];
  if (stats) {
    if (stats.totalMatches > 0 && stats.appliedCount === 0) {
      pool.push(
        `${stats.totalMatches} match${stats.totalMatches === 1 ? "" : "es"} found for u. applications sent: ZERO. get to it`,
      );
    }
    if (stats.newThisWeek > 0) {
      pool.push(
        `${stats.newThisWeek} new job${stats.newThisWeek === 1 ? "" : "s"} this week. Just do a few it wont kill you`,
      );
    }
    if (stats.appliedCount > 0) {
      pool.push(
        `${stats.appliedCount} application${stats.appliedCount === 1 ? "" : "s"} in. dooo morreeee`,
      );
    }
  }

  const source =
    pool.length > 0 ? [...pool, TAUNTS[Math.floor(random() * TAUNTS.length)]] : TAUNTS;
  return source[Math.floor(random() * source.length)];
}
