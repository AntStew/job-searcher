import type { jobPreferences, userProfiles } from "@/db/schema";

type Profile = typeof userProfiles.$inferSelect;
type Preferences = typeof jobPreferences.$inferSelect;

const MAX_RESULTS = 15;

export function buildSearchPrompt(profile: Profile, preferences: Preferences): string {
  const sections: string[] = [];

  sections.push(
    "You are helping a real person search for a job. They may have little experience job-hunting, so write your final explanations in plain, encouraging, jargon-free language — the kind a friend would use, not a corporate recruiter.",
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

  sections.push(
    [
      "# Your task",
      `Search the web for real, currently open job postings that genuinely fit this candidate. Prioritize quality over quantity — up to ${MAX_RESULTS} strong candidates is plenty; fewer honest matches beat a padded list.`,
      "Cast a wide net across different kinds of sources rather than relying on just one or two searches — for example: LinkedIn Jobs, Indeed, Glassdoor, ZipRecruiter, Wellfound/AngelList (for startups), Y Combinator's Work at a Startup board, industry- or role-specific boards where relevant, and individual company career pages (especially any companies named above). Don't stop after the first search; run several searches with different phrasing and sources to find the best possible set of matches.",
      "For each listing you include, read enough of it to honestly judge fit against the resume and everything above, and note the experience level or years of experience it asks for.",
      "Don't exclude a job just because it conflicts with something the candidate said matters to them — include it, but set dealbreaker_hit to true and reflect that honestly in the score and reasoning.",
      `Once you've finished searching, call submit_job_matches exactly once with everything you found (no more than ${MAX_RESULTS} results). Do not call it before you're done searching.`,
    ].join("\n"),
  );

  return sections.filter(Boolean).join("\n\n");
}
