import type { jobSourceEnum } from "@/db/schema";

export type JobSourceName = (typeof jobSourceEnum.enumValues)[number];

export type NormalizedJob = {
  source: JobSourceName;
  sourceJobId: string;
  url: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  descriptionText: string;
  postedAt: Date | null;
  rawJson: unknown;
};

export type SearchParams = {
  roles: string[];
  locations: string[];
  salaryMin: number | null;
};
