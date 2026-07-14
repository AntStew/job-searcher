import { describe, expect, it, vi } from "vitest";

// searchAndMatchForUser instantiates the DB and Anthropic clients at module
// load; only the zod contract for the agent's submit_job_matches tool is
// under test here.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {},
}));

import { matchSchema } from "./searchAndMatchForUser";

const VALID = {
  title: "Senior Plumber",
  company: "Pipes & Co",
  url: "https://example.com/job",
  score: 87,
  reasoning: "this one slaps",
  matched_criteria: ["salary", "location"],
  dealbreaker_hit: false,
};

describe("submit_job_matches result contract", () => {
  it("accepts a minimal valid match", () => {
    expect(matchSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts null and missing optional fields alike", () => {
    expect(
      matchSchema.safeParse({
        ...VALID,
        location: null,
        remote_type: null,
        salary_min: null,
        salary_max: null,
        experience_required: null,
        posted_at: null,
      }).success,
    ).toBe(true);
  });

  it("accepts fully populated optional fields", () => {
    expect(
      matchSchema.safeParse({
        ...VALID,
        location: "Austin TX",
        remote_type: "hybrid",
        salary_min: 90000,
        salary_max: 120000,
        experience_required: "3-5 years",
        posted_at: "2026-07-10",
      }).success,
    ).toBe(true);
  });

  it("rejects a match missing any required field", () => {
    for (const key of Object.keys(VALID)) {
      const broken: Record<string, unknown> = { ...VALID };
      delete broken[key];
      expect(matchSchema.safeParse(broken).success).toBe(false);
    }
  });

  it("rejects wrong types the agent could plausibly emit", () => {
    expect(matchSchema.safeParse({ ...VALID, score: "87" }).success).toBe(false);
    expect(matchSchema.safeParse({ ...VALID, matched_criteria: "salary" }).success).toBe(false);
    expect(matchSchema.safeParse({ ...VALID, dealbreaker_hit: "no" }).success).toBe(false);
  });
});
