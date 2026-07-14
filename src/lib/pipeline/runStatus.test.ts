import { describe, expect, it, vi } from "vitest";

// runStatus pulls in the DB client at module load; the pure helpers under
// test never touch it.
vi.mock("@/db", () => ({ db: {} }));

import { isRunInProgress, STALE_RUN_MINUTES } from "./runStatus";

const NOW = new Date("2026-07-14T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe("isRunInProgress", () => {
  it("is false when no run has been started", () => {
    expect(isRunInProgress(null, NOW)).toBe(false);
  });

  it("is true for a recent start", () => {
    expect(isRunInProgress(minutesAgo(1), NOW)).toBe(true);
    expect(isRunInProgress(minutesAgo(STALE_RUN_MINUTES - 1), NOW)).toBe(true);
  });

  it("treats a run older than the stale threshold as crashed", () => {
    expect(isRunInProgress(minutesAgo(STALE_RUN_MINUTES), NOW)).toBe(false);
    expect(isRunInProgress(minutesAgo(60), NOW)).toBe(false);
  });
});
