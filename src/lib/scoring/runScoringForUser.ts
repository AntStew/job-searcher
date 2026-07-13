import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobMatches, jobPreferences, userProfiles } from "@/db/schema";
import { candidateJobsForUser } from "./preFilter";
import { scoreJob } from "./scoreJob";

/**
 * Scores every not-yet-scored candidate job for a user and stores every
 * result in job_matches, regardless of their threshold — so changing the
 * threshold later never requires re-scoring.
 */
export async function runScoringForUser(userId: string): Promise<{ scored: number }> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  const [preferences] = await db
    .select()
    .from(jobPreferences)
    .where(eq(jobPreferences.userId, userId));

  if (!profile || !preferences) {
    return { scored: 0 };
  }

  const candidates = await candidateJobsForUser(userId, preferences);

  let scored = 0;
  for (const job of candidates) {
    const result = await scoreJob(profile.resumeText, preferences, job);

    await db
      .insert(jobMatches)
      .values({
        userId,
        jobId: job.id,
        score: result.score,
        reasoning: result.reasoning,
        matchedCriteria: result.matchedCriteria,
        dealbreakerHit: result.dealbreakerHit,
      })
      .onConflictDoNothing({ target: [jobMatches.userId, jobMatches.jobId] });

    scored += 1;
  }

  return { scored };
}
