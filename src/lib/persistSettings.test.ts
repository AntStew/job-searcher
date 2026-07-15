import { describe, expect, it, vi } from "vitest";

// persistSettings pulls in the DB client at module load; only the zod schema
// is under test here.
vi.mock("@/db", () => ({ db: {} }));

import { settingsSchema } from "./persistSettings";
import { clampWords, countWords, SETTINGS_LIMITS } from "./settingsLimits";

const VALID = {
  resumeText: "resume",
  desiredRoles: "Plumber, Electrician",
  locations: "Austin TX",
  remotePreference: "remote",
  salaryMin: "90000",
  yearsOfExperience: "3",
  industries: "",
  aboutYou: "",
  watchTargets: "",
  matchThreshold: "60",
  emailFrequency: "weekly",
  scheduleHour: "8",
  scheduleDayOfWeek: "1",
  scheduleDayOfMonth: "1",
  timezone: "America/Chicago",
};

describe("settingsSchema", () => {
  it("accepts a fully valid form", () => {
    expect(settingsSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects thresholds outside 0-100", () => {
    expect(settingsSchema.safeParse({ ...VALID, matchThreshold: "150" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...VALID, matchThreshold: "-1" }).success).toBe(false);
  });

  it("rejects schedule hours outside 0-23", () => {
    expect(settingsSchema.safeParse({ ...VALID, scheduleHour: "24" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...VALID, scheduleHour: "0" }).success).toBe(true);
  });

  it("caps day-of-month at 28 so every month qualifies", () => {
    expect(settingsSchema.safeParse({ ...VALID, scheduleDayOfMonth: "29" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...VALID, scheduleDayOfMonth: "28" }).success).toBe(true);
  });

  it("rejects unknown email frequencies and remote preferences", () => {
    expect(settingsSchema.safeParse({ ...VALID, emailFrequency: "hourly" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...VALID, remotePreference: "moon" }).success).toBe(false);
  });

  it("rejects an empty timezone", () => {
    expect(settingsSchema.safeParse({ ...VALID, timezone: "" }).success).toBe(false);
  });

  it("allows a resume up to the size cap and rejects beyond it", () => {
    expect(
      settingsSchema.safeParse({
        ...VALID,
        resumeText: "x".repeat(SETTINGS_LIMITS.resumeTextChars),
      }).success,
    ).toBe(true);
    expect(
      settingsSchema.safeParse({
        ...VALID,
        resumeText: "x".repeat(SETTINGS_LIMITS.resumeTextChars + 1),
      }).success,
    ).toBe(false);
  });

  it("caps about-you by word count", () => {
    const ok = Array.from({ length: SETTINGS_LIMITS.aboutYouWords }, () => "word").join(" ");
    const tooMany = `${ok} extra`;
    expect(settingsSchema.safeParse({ ...VALID, aboutYou: ok }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...VALID, aboutYou: tooMany }).success).toBe(false);
  });
});

describe("countWords / clampWords", () => {
  it("counts words and ignores empty input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  hi there  ")).toBe(2);
  });

  it("clamps to the first N words", () => {
    expect(clampWords("one two three four", 2)).toBe("one two");
    expect(clampWords("one two", 5)).toBe("one two");
  });
});
