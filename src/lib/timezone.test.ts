import { describe, expect, it } from "vitest";
import { getZonedParts } from "./timezone";

// Fixed instant: 2026-07-14T12:00:00Z is a Tuesday.
const NOON_UTC = new Date("2026-07-14T12:00:00Z");

describe("getZonedParts", () => {
  it("returns UTC parts unchanged for the UTC zone", () => {
    expect(getZonedParts(NOON_UTC, "UTC")).toEqual({ hour: 12, dayOfWeek: 2, dayOfMonth: 14 });
  });

  it("shifts whole-hour offsets (America/New_York, UTC-4 in July)", () => {
    expect(getZonedParts(NOON_UTC, "America/New_York")).toEqual({
      hour: 8,
      dayOfWeek: 2,
      dayOfMonth: 14,
    });
  });

  it("handles half-hour offsets (Asia/Kolkata, UTC+5:30)", () => {
    expect(getZonedParts(NOON_UTC, "Asia/Kolkata")).toEqual({
      hour: 17,
      dayOfWeek: 2,
      dayOfMonth: 14,
    });
  });

  it("rolls the day forward across midnight (Asia/Tokyo)", () => {
    expect(getZonedParts(new Date("2026-07-14T23:30:00Z"), "Asia/Tokyo")).toEqual({
      hour: 8,
      dayOfWeek: 3,
      dayOfMonth: 15,
    });
  });

  it("reports midnight as hour 0, never 24", () => {
    const parts = getZonedParts(new Date("2026-07-14T00:10:00Z"), "UTC");
    expect(parts.hour).toBe(0);
  });
});
