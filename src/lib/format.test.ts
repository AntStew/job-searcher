import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatSalary } from "./format";

describe("formatSalary", () => {
  it("returns null with no salary info", () => {
    expect(formatSalary(null, null)).toBeNull();
  });

  it("formats a range in $Nk", () => {
    expect(formatSalary(90000, 120000)).toBe("$90k – $120k");
  });

  it("collapses an equal min/max to one figure", () => {
    expect(formatSalary(100000, 100000)).toBe("$100k");
  });

  it("handles one-sided salaries", () => {
    expect(formatSalary(90000, null)).toBe("$90k");
    expect(formatSalary(null, 120000)).toBe("$120k");
  });

  it("rounds to the nearest thousand", () => {
    expect(formatSalary(89500, null)).toBe("$90k");
  });
});

describe("date formatting", () => {
  // Exact output is locale-dependent; assert the stable parts.
  it("formatDate includes month and day", () => {
    const text = formatDate(new Date("2026-07-14T12:00:00Z"));
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/14/);
  });

  it("formatDateTime shows 'Never yet' for null", () => {
    expect(formatDateTime(null)).toBe("Never yet");
  });

  it("formatDateTime includes a time component for real dates", () => {
    expect(formatDateTime(new Date("2026-07-14T12:00:00Z"))).toMatch(/\d{1,2}:\d{2}/);
  });
});
