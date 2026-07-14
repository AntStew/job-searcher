import { describe, expect, it } from "vitest";
import type { userSettings } from "@/db/schema";
import { CATCH_UP_HOURS, isDueNow, nextDueDate, SLOT_COOLDOWN_HOURS } from "./schedule";

type Settings = typeof userSettings.$inferSelect;

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    matchThreshold: 60,
    emailFrequency: "daily",
    scheduleHour: 7,
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1,
    runStartedAt: null,
    lastRunAt: null,
    lastManualRunAt: null,
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

// 2026-07-14 is a Tuesday (dayOfWeek 2). Schedule default: 7am UTC daily.
const IN_SLOT = new Date("2026-07-14T07:15:00Z");

describe("isDueNow — slot matching", () => {
  it("is due inside the scheduled hour", () => {
    expect(isDueNow(makeSettings(), IN_SLOT)).toBe(true);
  });

  it("evaluates the slot in the user's timezone", () => {
    // 7am America/Chicago in July is 12:00 UTC.
    const settings = makeSettings({ timezone: "America/Chicago" });
    expect(isDueNow(settings, new Date("2026-07-14T12:15:00Z"))).toBe(true);
    expect(isDueNow(settings, IN_SLOT)).toBe(false);
  });

  it("weekly and monthly require the day to match", () => {
    expect(isDueNow(makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 2 }), IN_SLOT)).toBe(true);
    expect(isDueNow(makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 3 }), IN_SLOT)).toBe(false);
    expect(isDueNow(makeSettings({ emailFrequency: "monthly", scheduleDayOfMonth: 14 }), IN_SLOT)).toBe(true);
    expect(isDueNow(makeSettings({ emailFrequency: "monthly", scheduleDayOfMonth: 15 }), IN_SLOT)).toBe(false);
  });

  it("is never due when paused or admin-locked", () => {
    expect(isDueNow(makeSettings({ emailFrequency: "paused" }), IN_SLOT)).toBe(false);
    expect(isDueNow(makeSettings({ adminLocked: true }), IN_SLOT)).toBe(false);
  });
});

describe("isDueNow — catch-up window (the GitHub-cron-skipped-my-hour fix)", () => {
  it("still fires when the trigger arrives up to 3 hours late", () => {
    // The exact scenario from prod: 7am slot, cron skipped 12:xx UTC and
    // fired at 8:30 / 9:59 / 10:59 instead — all must still deliver.
    expect(isDueNow(makeSettings(), new Date("2026-07-14T08:30:00Z"))).toBe(true);
    expect(isDueNow(makeSettings(), new Date("2026-07-14T09:59:00Z"))).toBe(true);
    expect(isDueNow(makeSettings(), new Date("2026-07-14T10:59:00Z"))).toBe(true);
  });

  it("gives up once the slot is older than the catch-up window", () => {
    expect(isDueNow(makeSettings(), new Date("2026-07-14T11:30:00Z"))).toBe(false);
    expect(isDueNow(makeSettings(), new Date("2026-07-14T06:30:00Z"))).toBe(false);
  });

  it("catches up across a day boundary (weekly Sunday 11pm, trigger Monday 1am)", () => {
    const settings = makeSettings({
      emailFrequency: "weekly",
      scheduleHour: 23,
      scheduleDayOfWeek: 0,
    });
    // 2026-07-12 is a Sunday; 23:00 slot, trigger fires 01:30 Monday.
    expect(isDueNow(settings, new Date("2026-07-13T01:30:00Z"))).toBe(true);
  });

  it("retries a failed run at the next trigger (failure leaves lastRunAt untouched)", () => {
    // 7:15 run crashed → lastRunAt still yesterday → 7:45 trigger retries.
    const settings = makeSettings({ lastRunAt: new Date("2026-07-13T07:20:00Z") });
    expect(isDueNow(settings, new Date("2026-07-14T07:45:00Z"))).toBe(true);
  });
});

describe("isDueNow — slot cooldown (no double sends)", () => {
  it("does not re-fire within the same slot after a successful run", () => {
    const settings = makeSettings({ lastRunAt: new Date("2026-07-14T07:14:00Z") });
    expect(isDueNow(settings, new Date("2026-07-14T07:44:00Z"))).toBe(false);
  });

  it("does not re-fire late in the catch-up window after a successful run", () => {
    const settings = makeSettings({ lastRunAt: new Date("2026-07-14T07:20:00Z") });
    expect(isDueNow(settings, new Date("2026-07-14T09:45:00Z"))).toBe(false);
  });

  it("fires again at the next day's slot", () => {
    const settings = makeSettings({ lastRunAt: new Date("2026-07-14T07:20:00Z") });
    expect(isDueNow(settings, new Date("2026-07-15T07:15:00Z"))).toBe(true);
  });

  it("does not double-send when DST repeats the scheduled hour", () => {
    // NY fall-back 2026-11-01: 1am local occurs at 05:30Z (EDT) and 06:30Z (EST).
    const first = new Date("2026-11-01T05:30:00Z");
    const second = new Date("2026-11-01T06:30:00Z");
    const settings = makeSettings({ timezone: "America/New_York", scheduleHour: 1 });
    expect(isDueNow(settings, first)).toBe(true);
    expect(isDueNow(makeSettings({ ...settings, lastRunAt: first }), second)).toBe(false);
  });

  it("skips a spring-forward day whose scheduled hour never exists", () => {
    // NY 2026-03-08 jumps 01:59 → 03:00; a 2am schedule can't match, even via catch-up.
    const settings = makeSettings({ timezone: "America/New_York", scheduleHour: 2 });
    for (let utcHour = 0; utcHour < 24; utcHour++) {
      expect(isDueNow(settings, new Date(Date.UTC(2026, 2, 8, utcHour, 30)))).toBe(false);
    }
  });

  it("cooldown can only ever suppress the same slot, not tomorrow's", () => {
    // Sanity on the constants the two guards rely on.
    expect(SLOT_COOLDOWN_HOURS).toBeGreaterThan(CATCH_UP_HOURS);
    expect(SLOT_COOLDOWN_HOURS).toBeLessThan(20); // < shortest gap between daily slots
  });
});

describe("isDueNow — manual runs are invisible to the schedule", () => {
  it("a manual run minutes before the slot does not suppress it", () => {
    // The exact bug report: Run Now at 10:53pm, 7am email still owed.
    const settings = makeSettings({
      timezone: "America/Chicago",
      lastManualRunAt: new Date("2026-07-14T03:53:00Z"), // 10:53pm Chicago
      lastEmailSentAt: new Date("2026-07-14T03:53:00Z"), // manual digest went out too
    });
    expect(isDueNow(settings, new Date("2026-07-14T12:15:00Z"))).toBe(true);
  });

  it("even a manual run during the slot itself does not suppress it", () => {
    const settings = makeSettings({ lastManualRunAt: new Date("2026-07-14T07:05:00Z") });
    expect(isDueNow(settings, new Date("2026-07-14T07:30:00Z"))).toBe(true);
  });
});

describe("nextDueDate", () => {
  it("returns null when paused or admin-locked", () => {
    expect(nextDueDate(makeSettings({ emailFrequency: "paused" }), IN_SLOT)).toBeNull();
    expect(nextDueDate(makeSettings({ adminLocked: true }), IN_SLOT)).toBeNull();
  });

  it("finds today's slot when it hasn't passed yet", () => {
    const next = nextDueDate(makeSettings(), new Date("2026-07-14T05:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-14T07:00:00.000Z");
  });

  it("rolls to tomorrow when today's slot has passed", () => {
    const next = nextDueDate(makeSettings(), new Date("2026-07-14T09:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("finds the right weekly slot", () => {
    // From Tuesday 09:00, next Monday-07:00 slot is 2026-07-20.
    const settings = makeSettings({ emailFrequency: "weekly", scheduleDayOfWeek: 1 });
    const next = nextDueDate(settings, new Date("2026-07-14T09:00:00Z"));
    expect(next?.toISOString()).toBe("2026-07-20T07:00:00.000Z");
  });
});
