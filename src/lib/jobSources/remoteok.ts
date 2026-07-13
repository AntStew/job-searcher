import type { NormalizedJob, SearchParams } from "./types";

type RemoteOkResult = {
  id?: string;
  slug?: string;
  url?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  description?: string;
  date?: string;
};

export async function fetchRemoteOkJobs(params: SearchParams): Promise<NormalizedJob[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "job-searcher-family-app (personal use)" },
  });
  if (!res.ok) {
    throw new Error(`RemoteOK request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as RemoteOkResult[];
  // RemoteOK's first array element is a legal notice, not a job.
  const listings = body.filter((item) => item.id && item.position);

  const roleKeywords = params.roles.map((r) => r.toLowerCase());

  return listings
    .filter((job) => {
      if (roleKeywords.length === 0) return true;
      const haystack = `${job.position ?? ""} ${(job.tags ?? []).join(" ")}`.toLowerCase();
      return roleKeywords.some((keyword) => haystack.includes(keyword));
    })
    .map((job): NormalizedJob => ({
      source: "remoteok",
      sourceJobId: job.id!,
      url: job.url ?? `https://remoteok.com/remote-jobs/${job.slug ?? job.id}`,
      title: job.position!,
      company: job.company ?? "Unknown",
      location: job.location ?? "Remote",
      remoteType: "remote",
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      descriptionText: job.description ?? "",
      postedAt: job.date ? new Date(job.date) : null,
      rawJson: job,
    }));
}
