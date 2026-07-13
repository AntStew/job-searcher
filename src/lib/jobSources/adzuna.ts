import type { NormalizedJob, SearchParams } from "./types";

const ADZUNA_COUNTRY = "us";

type AdzunaResult = {
  id: string;
  redirect_url: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  description?: string;
  created?: string;
};

export async function fetchAdzunaJobs(params: SearchParams): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return [];
  }

  const what = params.roles.slice(0, 3).join(" ");
  const where = params.locations[0] ?? "";

  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1`,
  );
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "50");
  if (what) url.searchParams.set("what", what);
  if (where) url.searchParams.set("where", where);
  if (params.salaryMin) url.searchParams.set("salary_min", String(params.salaryMin));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Adzuna request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { results?: AdzunaResult[] };

  return (body.results ?? []).map((job): NormalizedJob => ({
    source: "adzuna",
    sourceJobId: job.id,
    url: job.redirect_url,
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? null,
    remoteType: null,
    salaryMin: job.salary_min ? Math.round(job.salary_min) : null,
    salaryMax: job.salary_max ? Math.round(job.salary_max) : null,
    descriptionText: job.description ?? "",
    postedAt: job.created ? new Date(job.created) : null,
    rawJson: job,
  }));
}
