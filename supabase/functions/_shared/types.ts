import type { jobSourceEnum } from "./schema.ts";

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
  experienceRequired: string | null;
  descriptionText: string;
  postedAt: Date | null;
  rawJson: unknown;
};
