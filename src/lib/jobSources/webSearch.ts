import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NormalizedJob, SearchParams } from "./types";

const anthropic = new Anthropic();

const webSearchJobSchema = z.object({
  url: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable().optional(),
  remote_type: z.string().nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  description: z.string().optional(),
  posted_at: z.string().nullable().optional(),
});

const webSearchResultsSchema = z.array(webSearchJobSchema);

function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Runs one Claude web-search-tool call scoped to a single user-specified
 * target (company name or other free-text watch item) and returns any
 * current job postings it finds there, in the same shape as the other
 * job source adapters.
 */
export async function fetchTargetedJobs(
  target: string,
  params: SearchParams,
): Promise<NormalizedJob[]> {
  const roleHint = params.roles.length > 0 ? params.roles.join(", ") : "any role";
  const locationHint = params.locations.length > 0 ? params.locations.join(", ") : "any location";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Search the web for current open job postings at "${target}" that match roles like: ${roleHint}, in locations: ${locationHint}. Only include postings that appear genuinely open right now on the company's own careers page or a job board. After searching, respond with ONLY a JSON array (no prose, no markdown fences) of objects with this shape: {"url": string, "title": string, "company": string, "location": string|null, "remote_type": string|null, "salary_min": number|null, "salary_max": number|null, "description": string, "posted_at": string|null (ISO date if known)}. If you find nothing, respond with [].`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  const jsonText = extractJsonArray(textBlock.text);
  if (!jsonText) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const result = webSearchResultsSchema.safeParse(parsed);
  if (!result.success) return [];

  return result.data.map((job): NormalizedJob => {
    const url = normalizeUrl(job.url);
    return {
      source: "web_search",
      sourceJobId: url,
      url,
      title: job.title,
      company: job.company,
      location: job.location ?? null,
      remoteType: job.remote_type ?? null,
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      descriptionText: job.description ?? "",
      postedAt: job.posted_at ? new Date(job.posted_at) : null,
      rawJson: job,
    };
  });
}
