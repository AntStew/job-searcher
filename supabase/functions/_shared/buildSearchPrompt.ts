import type { jobPreferences, userProfiles } from "./schema.ts";
import { TAUNTS } from "./taunts.ts";

type Profile = typeof userProfiles.$inferSelect;
type Preferences = typeof jobPreferences.$inferSelect;

const MAX_RESULTS = 15;

export type SearchHistory = {
  /** "Title at Company" lines the user has already been shown. */
  known: string[];
  /** Jobs the user thumbs-upped — steer toward more like these. */
  liked: string[];
  /** Jobs the user thumbs-downed — steer away from these. */
  disliked: string[];
};

const EMPTY_HISTORY: SearchHistory = { known: [], liked: [], disliked: [] };

export function buildSearchPrompt(
  profile: Profile,
  preferences: Preferences,
  history: SearchHistory = EMPTY_HISTORY,
): string {
  const sections: string[] = [];

  sections.push(
    [
      "You are helping a real person search for a job. Write like their funny, brutally honest friend texting them about a job listing — not a recruiter, not HR, not a corporate LinkedIn post. Casual, a little teasing, genuinely on their side.",
      "Here's exactly how this person jokes and talks — match this voice (the slang, the bluntness, the ALL CAPS when it's warranted, the specific sense of humor) rather than a generic 'friendly' tone:",
      TAUNTS.map((t) => `- "${t}"`).join("\n"),
      "Keep it short (1-3 sentences), no corporate jargon ('synergy', 'dynamic environment', 'fast-paced team'), and never fake enthusiasm for a bad match — if it's mediocre, say so, and let the score reflect it. The humor is a bonus, the honesty about fit is the actual job.",
    ].join("\n"),
  );

  sections.push(
    [
      "# Candidate background",
      `Years of experience: ${preferences.yearsOfExperience ?? "not specified"}`,
      "",
      "Resume:",
      profile.resumeText || "(no resume provided)",
      preferences.aboutYou ? `\nIn their own words: ${preferences.aboutYou}` : "",
    ]
      .join("\n")
      .trim(),
  );

  sections.push(
    [
      "# What they're looking for",
      `Desired roles: ${preferences.desiredRoles.join(", ") || "(open to suggestions based on their background)"}`,
      `Locations: ${preferences.locations.join(", ") || "(no preference)"}`,
      `Remote preference: ${preferences.remotePreference}`,
      `Minimum salary: ${preferences.salaryMin ? `$${preferences.salaryMin.toLocaleString()}` : "(not specified)"}`,
      `Industries: ${preferences.industries.join(", ") || "(no preference)"}`,
      preferences.watchTargets.length > 0
        ? `Specifically check whether these companies have open roles that fit: ${preferences.watchTargets.join(", ")}`
        : "",
    ]
      .join("\n")
      .trim(),
  );

  if (history.liked.length > 0 || history.disliked.length > 0) {
    sections.push(
      [
        "# What their reactions to past matches tell you",
        history.liked.length > 0
          ? `They gave a thumbs-up to these — find more jobs with a similar flavor (role type, company style, seniority):\n${history.liked.map((job) => `- ${job}`).join("\n")}`
          : "",
        history.disliked.length > 0
          ? `They gave a thumbs-down to these — avoid jobs that resemble them, and let that inform your scoring:\n${history.disliked.map((job) => `- ${job}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  if (history.known.length > 0) {
    sections.push(
      [
        "# Already found on previous runs (do NOT include these again)",
        "The candidate has already been shown these — resubmitting them wastes a result slot:",
        ...history.known.map((job) => `- ${job}`),
      ].join("\n"),
    );
  }

  sections.push(
    [
      "# Your task",
      `Search the web for real, currently open job postings that genuinely fit this candidate. Prioritize quality over quantity — up to ${MAX_RESULTS} strong candidates is plenty; fewer honest matches beat a padded list. Prefer recently posted listings — a great job posted this week beats an equally great one posted months ago that may already be filled.`,
      "Cast a wide net across different kinds of sources rather than relying on just one or two searches — for example: LinkedIn Jobs, Indeed, Glassdoor, ZipRecruiter, Wellfound/AngelList (for startups), Y Combinator's Work at a Startup board, industry- or role-specific boards where relevant, and individual company career pages (especially any companies named above). Don't stop after the first search; run several searches with different phrasing and sources to find the best possible set of matches.",
      "For each listing you include, read enough of it to honestly judge fit against the resume and everything above, and note the experience level or years of experience it asks for.",
      "Don't exclude a job just because it conflicts with something the candidate said matters to them — include it, but set dealbreaker_hit to true and reflect that honestly in the score and reasoning.",
      `Once you've finished searching, call submit_job_matches exactly once with everything you found (no more than ${MAX_RESULTS} results). Do not call it before you're done searching.`,
    ].join("\n"),
  );

  return sections.filter(Boolean).join("\n\n");
}
