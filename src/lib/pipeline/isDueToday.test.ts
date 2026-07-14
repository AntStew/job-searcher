import { describe, expect, it } from "vitest";
import type { userSettings } from "@/db/schema";
import { isDueToday, nextDueDate } from "./isDueToday";

type Settings = typeof userSettings.$inferSelect;

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    matchThreshold: 60,
    emailFrequency: "daily",
    scheduleHour: 8,
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1,
    runStartedAt: null,
    lastRunAt: null,
    lastRunError: null,
    lastEmailSentAt: null,
    onboardedAt: new Date("2026-01-01T00:00:00Z"),
    timezone: "UTC",
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalWebSearches: 0,
    adminLocked: false,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// 2026-07-14 is a Tuesday (dayOfWeek 2).
const TUE_8AM_UTC = new Date("2026-07-14T08:30:00Z");

describe("isDueToday", () => {
  it("is due when the current hour matches the scheduled hour (daily)", () => {
    expect(isDueToday(makeSettings(), TUE_8AM_UTC)).toBe(true);
  });

  it("is not due at any other hour", () => {
    expect(isDueToday(makeSettings(), new Date("2026-07-14T09:30:00Z"))).toBe(false);
  });

  it("evaluates the scheduled hour in the user's timezone", () => {
    // 12:00 UTC is 08:00 in New York during July (UTC-4).
    const settings = makeSettings({ timezone: "America/New_York" });
    expect(isDueToday(settings, new Date("2026-07-14T12:30:00Z"))).toBe(true);
    expect(isDueToday(settings, TUE_8AM_UTC)).toBe(false);
  });

  it("weekly requires the day of week to match too", () => {
    const settings = makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 2 });
    expect(isDueToday(settings, TUE_8AM_UTC)).toBe(true);
    expect(isDueToday(makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 3 }), TUE_8AM_UTC)).toBe(false);
  });

  it("monthly requires the day of month to match too", () => {
    const settings = makeSettings({ emailFrequency: "monthly", scheduleDayOfMonth: 14 });
    expect(isDueToday(settings, TUE_8AM_UTC)).toBe(true);
    expect(isDueToday(makeSettings({ emailFrequency: "monthly", scheduleDayOfMonth: 15 }), TUE_8AM_UTC)).toBe(false);
  });

  it("is never due when paused or admin-locked", () => {
    expect(isDueToday(makeSettings({ emailFrequency: "paused" }), TUE_8AM_UTC)).toBe(false);
    expect(isDueToday(makeSettings({ adminLocked: true }), TUE_8AM_UTC)).toBe(false);
  });

  it("suppresses a second send within the min-gap window", () => {
    // Daily min gap is 20h; an email 2h ago blocks, 21h ago doesn't.
    const twoHoursAgo = new Date(TUE_8AM_UTC.getTime() - 2 * 60 * 60 * 1000);
    const twentyOneHoursAgo = new Date(TUE_8AM_UTC.getTime() - 21 * 60 * 60 * 1000);
    expect(isDueToday(makeSettings({ lastEmailSentAt: twoHoursAgo }), TUE_8AM_UTC)).toBe(false);
    expect(isDueToday(makeSettings({ lastEmailSentAt: twentyOneHoursAgo }), TUE_8AM_UTC)).toBe(true);
  });
});

describe("nextDueDate", () => {
  it("returns null when paused or admin-locked", () => {
    expect(nextDueDate(makeSettings({ emailFrequency: "paused" }), TUE_8AM_UTC)).toBeNull();
    expect(nextDueDate(makeSettings({ adminLocked: true }), TUE_8AM_UTC)).toBeNull();
  });

  it("finds today's slot when it hasn't passed yet", () => {
    const next = nextDueDate(makeSettings(), new Date("2026-07-14T05:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-14T08:00:00.000Z");
  });

  it("rolls to tomorrow when today's slot has passed", () => {
    const next = nextDueDate(makeSettings(), new Date("2026-07-14T09:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("ignores the min-gap guard — it reflects the schedule, not send permission", () => {
    const justEmailed = makeSettings({ lastEmailSentAt: new Date("2026-07-14T04:00:00Z") });
    const next = nextDueDate(justEmailed, new Date("2026-07-14T05:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-14T08:00:00.000Z");
  });

  it("finds the right weekly slot", () => {
    // From Tuesday 09:00, next Monday-08:00 slot is 2026-07-20.
    const settings = makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 1 });
    const next = nextDueDate(settings, new Date("2026-07-14T09:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-20T08:00:00.000Z");
  });
});
