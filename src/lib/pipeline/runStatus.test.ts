import { describe, expect, it, vi } from "vitest";

// runStatus pulls in the DB client at module load; the pure helpers under
// test never touch it.
vi.mock("@/db", () => ({ db: {} }));

import {
  hoursUntilManualRunAllowed,
  isRunInProgress,
  MANUAL_RUN_COOLDOWN_HOURS,
  STALE_RUN_MINUTES,
} from "./runStatus";

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

describe("hoursUntilManualRunAllowed", () => {
  it("allows immediately when the user has never run manually", () => {
    expect(hoursUntilManualRunAllowed(null, NOW)).toBe(0);
  });

  it("blocks inside the 12h cooldown with the remaining hours", () => {
    const threeHoursAgo = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(hoursUntilManualRunAllowed(threeHoursAgo, NOW)).toBeCloseTo(
      MANUAL_RUN_COOLDOWN_HOURS - 3,
    );
  });

  it("allows again once the cooldown has fully elapsed", () => {
    const thirteenHoursAgo = new Date(NOW.getTime() - 13 * 60 * 60 * 1000);
    expect(hoursUntilManualRunAllowed(thirteenHoursAgo, NOW)).toBe(0);
  });
});
