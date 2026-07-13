import { fetchAdzunaJobs } from "@/lib/jobSources/adzuna";
import { fetchRemoteOkJobs } from "@/lib/jobSources/remoteok";
import { fetchTargetedJobs } from "@/lib/jobSources/webSearch";
import { upsertJobs } from "@/lib/jobSources/upsertJobs";
import type { NormalizedJob } from "@/lib/jobSources/types";
import type { jobPreferences } from "@/db/schema";

type Preferences = typeof jobPreferences.$inferSelect;

export async function fetchJobsForUser(preferences: Preferences) {
  const searchParams = {
    roles: preferences.desiredRoles,
    locations: preferences.locations,
    salaryMin: preferences.salaryMin,
  };

  const [adzunaResults, remoteOkResults, ...targetedResults] = await Promise.all([
    fetchAdzunaJobs(searchParams).catch(() => [] as NormalizedJob[]),
    fetchRemoteOkJobs(searchParams).catch(() => [] as NormalizedJob[]),
    ...preferences.watchTargets.map((target) =>
      fetchTargetedJobs(target, searchParams).catch(() => [] as NormalizedJob[]),
    ),
  ]);

  const allJobs = [adzunaResults, remoteOkResults, ...targetedResults].flat();
  const upserted = await upsertJobs(allJobs);

  return {
    fetched: allJobs.length,
    upserted: upserted.length,
    bySource: {
      adzuna: adzunaResults.length,
      remoteok: remoteOkResults.length,
      web_search: targetedResults.flat().length,
    },
  };
}
