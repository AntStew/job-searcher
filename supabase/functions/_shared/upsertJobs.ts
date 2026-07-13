import { and, eq } from "npm:drizzle-orm";
import { db } from "./db.ts";
import { jobs } from "./schema.ts";
import type { NormalizedJob } from "./types.ts";

/**
 * Upserts normalized listings into the shared jobs cache, deduping on
 * (source, source_job_id). Returns the resulting job rows (existing or
 * newly inserted) so callers can pass their ids on to scoring.
 */
export async function upsertJobs(normalizedJobs: NormalizedJob[]) {
  const results: { id: string; source: NormalizedJob["source"]; sourceJobId: string }[] = [];

  for (const job of normalizedJobs) {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.source, job.source), eq(jobs.sourceJobId, job.sourceJobId)));

    if (existing) {
      results.push({ id: existing.id, source: job.source, sourceJobId: job.sourceJobId });
      continue;
    }

    const [inserted] = await db
      .insert(jobs)
      .values({
        source: job.source,
        sourceJobId: job.sourceJobId,
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location,
        remoteType: job.remoteType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        experienceRequired: job.experienceRequired,
        descriptionText: job.descriptionText,
        postedAt: job.postedAt,
        rawJson: job.rawJson,
      })
      .onConflictDoNothing({ target: [jobs.source, jobs.sourceJobId] })
      .returning({ id: jobs.id });

    if (inserted) {
      results.push({ id: inserted.id, source: job.source, sourceJobId: job.sourceJobId });
    } else {
      // Lost a race with a concurrent upsert of the same (source, source_job_id).
      const [raceWinner] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.source, job.source), eq(jobs.sourceJobId, job.sourceJobId)));
      if (raceWinner) {
        results.push({ id: raceWinner.id, source: job.source, sourceJobId: job.sourceJobId });
      }
    }
  }

  return results;
}
