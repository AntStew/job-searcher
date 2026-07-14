import { describe, expect, it } from "vitest";
import type { jobPreferences, userProfiles } from "@/db/schema";
import { TAUNTS } from "@/lib/taunts";
import { buildSearchPrompt, type SearchHistory } from "./buildSearchPrompt";

type Profile = typeof userProfiles.$inferSelect;
type Preferences = typeof jobPreferences.$inferSelect;

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    resumeText: "Five years of plumbing experience.",
    resumeUpdatedAt: null,
    ...overrides,
  };
}

function makePreferences(overrides: Partial<Preferences> = {}): Preferences {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    desiredRoles: ["Plumber"],
    locations: ["Austin TX"],
    remotePreference: "no_preference",
    salaryMin: 60000,
    yearsOfExperience: 5,
    industries: [],
    aboutYou: "",
    watchTargets: [],
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("buildSearchPrompt", () => {
  it("includes the candidate's resume and preferences", () => {
    const prompt = buildSearchPrompt(makeProfile(), makePreferences());
    expect(prompt).toContain("Five years of plumbing experience.");
    expect(prompt).toContain("Desired roles: Plumber");
    expect(prompt).toContain("Locations: Austin TX");
    expect(prompt).toContain("Minimum salary: $60,000");
  });

  it("feeds the user's taunts in as voice examples", () => {
    const prompt = buildSearchPrompt(makeProfile(), makePreferences());
    for (const taunt of TAUNTS.slice(0, 3)) {
      expect(prompt).toContain(taunt);
    }
  });

  it("omits history sections when there is no history", () => {
    const prompt = buildSearchPrompt(makeProfile(), makePreferences());
    expect(prompt).not.toContain("Already found on previous runs");
    expect(prompt).not.toContain("reactions to past matches");
  });

  it("lists known jobs as an exclusion list", () => {
    const history: SearchHistory = {
      known: ["Plumber at Pipes Inc"],
      liked: [],
      disliked: [],
    };
    const prompt = buildSearchPrompt(makeProfile(), makePreferences(), history);
    expect(prompt).toContain("Already found on previous runs (do NOT include these again)");
    expect(prompt).toContain("- Plumber at Pipes Inc");
  });

  it("separates liked and disliked feedback", () => {
    const history: SearchHistory = {
      known: [],
      liked: ["Senior Plumber at GoodCo"],
      disliked: ["Sales Rep at ColdCallers"],
    };
    const prompt = buildSearchPrompt(makeProfile(), makePreferences(), history);
    expect(prompt).toContain("thumbs-up");
    expect(prompt).toContain("Senior Plumber at GoodCo");
    expect(prompt).toContain("thumbs-down");
    expect(prompt).toContain("Sales Rep at ColdCallers");
  });

  it("asks the agent to check watch-target companies", () => {
    const prompt = buildSearchPrompt(
      makeProfile(),
      makePreferences({ watchTargets: ["DreamCorp"] }),
    );
    expect(prompt).toContain("DreamCorp");
  });

  it("tells the agent to flag dealbreakers instead of dropping jobs", () => {
    const prompt = buildSearchPrompt(makeProfile(), makePreferences());
    expect(prompt).toContain("dealbreaker_hit");
  });

  it("handles an empty resume gracefully", () => {
    const prompt = buildSearchPrompt(makeProfile({ resumeText: "" }), makePreferences());
    expect(prompt).toContain("(no resume provided)");
  });
});
