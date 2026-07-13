import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { jobMatches, jobs } from "@/db/schema";
import type { jobPreferences } from "@/db/schema";

type Preferences = typeof jobPreferences.$inferSelect;

/**
 * Cheap, free pre-filter run before any LLM call: drops jobs already
 * scored for this user, and (for API-sourced jobs only — targeted web
 * search results are already scoped to a user-specified company) drops
 * jobs whose title/description don't mention any desired role, whose
 * location doesn't match, or whose salary ceiling is below the user's floor.
 */
export async function candidateJobsForUser(userId: string, preferences: Preferences) {
  const alreadyScored = await db
    .select({ jobId: jobMatches.jobId })
    .from(jobMatches)
    .where(eq(jobMatches.userId, userId));
  const scoredJobIds = alreadyScored.map((row) => row.jobId);

  const unscored = await db
    .select()
    .from(jobs)
    .where(scoredJobIds.length > 0 ? notInArray(jobs.id, scoredJobIds) : undefined);

  const roleKeywords = preferences.desiredRoles.map((r) => r.toLowerCase());
  const locationKeywords = preferences.locations.map((l) => l.toLowerCase());

  return unscored.filter((job) => {
    if (job.source === "web_search") {
      // Already scoped to a user-specified target; only salary still applies.
      return passesSalaryFloor(job.salaryMax, preferences.salaryMin);
    }

    const matchesRole =
      roleKeywords.length === 0 ||
      roleKeywords.some((keyword) =>
        `${job.title} ${job.descriptionText}`.toLowerCase().includes(keyword),
      );

    const matchesLocation =
      locationKeywords.length === 0 ||
      preferences.remotePreference === "remote" ||
      locationKeywords.some((keyword) => (job.location ?? "").toLowerCase().includes(keyword));

    return matchesRole && matchesLocation && passesSalaryFloor(job.salaryMax, preferences.salaryMin);
  });
}

function passesSalaryFloor(salaryMax: number | null, salaryMin: number | null): boolean {
  if (!salaryMin || !salaryMax) return true; // unknown salary: don't disqualify
  return salaryMax >= salaryMin;
}
