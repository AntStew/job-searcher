import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobMatches, jobPreferences, userProfiles } from "@/db/schema";
import { buildSearchPrompt } from "./buildSearchPrompt";
import { upsertJobs } from "@/lib/jobSources/upsertJobs";
import type { NormalizedJob } from "@/lib/jobSources/types";

const anthropic = new Anthropic();

const SUBMIT_JOB_MATCHES_TOOL: Anthropic.Tool = {
  name: "submit_job_matches",
  description: "Submit the job postings you found and how well each one fits the candidate.",
  input_schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            url: { type: "string", description: "Direct link to the posting." },
            location: { type: ["string", "null"] },
            remote_type: { type: ["string", "null"], description: "e.g. remote, hybrid, onsite" },
            salary_min: { type: ["number", "null"] },
            salary_max: { type: ["number", "null"] },
            experience_required: {
              type: ["string", "null"],
              description: "e.g. '3-5 years' or 'Entry level, no experience required'",
            },
            score: { type: "integer", minimum: 0, maximum: 100 },
            reasoning: {
              type: "string",
              description: "1-3 plain-language sentences on why this is (or isn't) a good match.",
            },
            matched_criteria: { type: "array", items: { type: "string" } },
            dealbreaker_hit: { type: "boolean" },
            posted_at: { type: ["string", "null"], description: "ISO date if known" },
          },
          required: [
            "title",
            "company",
            "url",
            "score",
            "reasoning",
            "matched_criteria",
            "dealbreaker_hit",
          ],
        },
      },
    },
    required: ["matches"],
  },
};

const matchSchema = z.object({
  title: z.string(),
  company: z.string(),
  url: z.string(),
  location: z.string().nullable().optional(),
  remote_type: z.string().nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  experience_required: z.string().nullable().optional(),
  score: z.number(),
  reasoning: z.string(),
  matched_criteria: z.array(z.string()),
  dealbreaker_hit: z.boolean(),
  posted_at: z.string().nullable().optional(),
});

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

export type SearchAndMatchResult = {
  found: number;
  upserted: number;
  scored: number;
  errors: string[];
};

/**
 * Replaces the old fetch-then-score two-step pipeline: one Claude agent call
 * does the web searching (server-executed web_search tool, can run several
 * searches within this single request) and the fit-scoring together, since
 * judging fit requires having actually read the posting anyway.
 */
export async function searchAndMatchForUser(userId: string): Promise<SearchAndMatchResult> {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const [preferences] = await db
    .select()
    .from(jobPreferences)
    .where(eq(jobPreferences.userId, userId));

  if (!profile || !preferences) {
    return { found: 0, upserted: 0, scored: 0, errors: ["No profile or preferences set yet"] };
  }

  const prompt = buildSearchPrompt(profile, preferences);
  const errors: string[] = [];

  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 12000,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 15 },
        SUBMIT_JOB_MATCHES_TOOL,
      ],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    const message = `Search agent call failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error("[searchAndMatchForUser]", message);
    return { found: 0, upserted: 0, scored: 0, errors: [message] };
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "submit_job_matches",
  );

  if (!toolUse) {
    const message = "Search agent did not return any results this run.";
    console.error("[searchAndMatchForUser]", message, JSON.stringify(response.content));
    return { found: 0, upserted: 0, scored: 0, errors: [message] };
  }

  const parsed = z.object({ matches: z.array(matchSchema) }).safeParse(toolUse.input);
  if (!parsed.success) {
    const message = `Search agent returned malformed results: ${parsed.error.message}`;
    console.error("[searchAndMatchForUser]", message);
    return { found: 0, upserted: 0, scored: 0, errors: [message] };
  }

  const matches = parsed.data.matches;

  const normalizedJobs: NormalizedJob[] = matches.map((match) => {
    const url = normalizeUrl(match.url);
    return {
      source: "web_search",
      sourceJobId: url,
      url,
      title: match.title,
      company: match.company,
      location: match.location ?? null,
      remoteType: match.remote_type ?? null,
      salaryMin: match.salary_min ?? null,
      salaryMax: match.salary_max ?? null,
      experienceRequired: match.experience_required ?? null,
      descriptionText: "",
      postedAt: match.posted_at ? new Date(match.posted_at) : null,
      rawJson: match,
    };
  });

  const upserted = await upsertJobs(normalizedJobs);
  const jobIdByUrl = new Map(upserted.map((job) => [job.sourceJobId, job.id]));

  let scored = 0;
  for (const match of matches) {
    const jobId = jobIdByUrl.get(normalizeUrl(match.url));
    if (!jobId) continue;

    await db
      .insert(jobMatches)
      .values({
        userId,
        jobId,
        score: Math.max(0, Math.min(100, Math.round(match.score))),
        reasoning: match.reasoning,
        matchedCriteria: match.matched_criteria,
        dealbreakerHit: match.dealbreaker_hit,
      })
      .onConflictDoNothing({ target: [jobMatches.userId, jobMatches.jobId] });

    scored += 1;
  }

  return { found: matches.length, upserted: upserted.length, scored, errors };
}
