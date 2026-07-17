import Anthropic from "@anthropic-ai/sdk";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobMatches, jobPreferences, jobs, userProfiles, userSettings } from "@/db/schema";
import { buildSearchPrompt } from "./buildSearchPrompt";
import { upsertJobs } from "@/lib/jobSources/upsertJobs";
import { normalizeUrl } from "@/lib/jobSources/normalizeUrl";
import type { NormalizedJob } from "@/lib/jobSources/types";

async function recordUsage(userId: string, usage: Anthropic.Usage) {
  const webSearches = usage.server_tool_use?.web_search_requests ?? 0;
  await db
    .update(userSettings)
    .set({
      totalInputTokens: sql`${userSettings.totalInputTokens} + ${usage.input_tokens}`,
      totalOutputTokens: sql`${userSettings.totalOutputTokens} + ${usage.output_tokens}`,
      totalWebSearches: sql`${userSettings.totalWebSearches} + ${webSearches}`,
    })
    .where(eq(userSettings.userId, userId));
}

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
              description:
                "1-3 sentences, written like a blunt, funny friend texting them about this listing — casual, honest, a little teasing, zero corporate jargon. See system prompt for tone examples.",
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

export const matchSchema = z.object({
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

/**
 * The agent sometimes emits posted_at values that aren't parseable dates
 * ("2 weeks ago", "recently"). An Invalid Date here used to crash the whole
 * run at insert time ("Invalid time value"), so treat unparseable as unknown.
 */
export function parsePostedAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type SearchAndMatchResult = {
  found: number;
  upserted: number;
  scored: number;
  errors: string[];
  /**
   * True when the run produced zero usable matches for a benign reason
   * (agent timed out, got cut off, or genuinely found nothing new) — the
   * caller sends a friendly "came up empty" note instead of a failure alert.
   */
  cameUpEmpty: boolean;
};

/**
 * Hard deadline on the agent call. Supabase's free-plan edge workers are
 * killed at ~150s wall clock (measured: every historical failure died at
 * 153-154s), and a killed run records nothing. 100s leaves ~50s of worker
 * budget to save results, send the digest, and record the outcome — turning
 * a silent death into a handled "came up empty" email.
 */
const SEARCH_TIMEOUT_MS = 120 * 1000;

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
    return {
      found: 0,
      upserted: 0,
      scored: 0,
      errors: ["No profile or preferences set yet"],
      cameUpEmpty: false,
    };
  }

  // Give the agent this user's history: jobs already shown (so it doesn't
  // waste result slots on duplicates — they get dropped on insert anyway)
  // and thumbs-up/down reactions (so results drift toward their taste).
  const recentMatches = await db
    .select({ title: jobs.title, company: jobs.company, feedback: jobMatches.feedback })
    .from(jobMatches)
    .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
    .where(eq(jobMatches.userId, userId))
    .orderBy(desc(jobMatches.scoredAt))
    .limit(60);
  const asLine = (row: { title: string; company: string }) => `${row.title} at ${row.company}`;
  const history = {
    known: recentMatches.slice(0, 40).map(asLine),
    liked: recentMatches.filter((row) => row.feedback === "liked").slice(0, 15).map(asLine),
    disliked: recentMatches.filter((row) => row.feedback === "disliked").slice(0, 15).map(asLine),
  };

  const prompt = buildSearchPrompt(profile, preferences, history);
  const errors: string[] = [];

  let response;
  try {
    response = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        // Output tokens dominate latency — a tighter cap keeps the emission
        // phase short so the run lands inside SEARCH_TIMEOUT_MS.
        max_tokens: 8000,
        tools: [
          // The 20260209 variant filters results with server-side code before
          // they hit the context window — better matches, fewer input tokens.
          // max_uses is deliberately low: the whole search must land inside
          // SEARCH_TIMEOUT_MS. See MAX_RESULTS in buildSearchPrompt.
          { type: "web_search_20260209", name: "web_search", max_uses: 3 },
          SUBMIT_JOB_MATCHES_TOOL,
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: prompt }],
      },
      // maxRetries: 0 keeps the deadline hard — the SDK's default retries
      // would triple it.
      { timeout: SEARCH_TIMEOUT_MS, maxRetries: 0 },
    );
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      const message = "Search agent ran out of time this run.";
      console.error("[searchAndMatchForUser]", message);
      return { found: 0, upserted: 0, scored: 0, errors: [message], cameUpEmpty: true };
    }
    const message = `Search agent call failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error("[searchAndMatchForUser]", message);
    return { found: 0, upserted: 0, scored: 0, errors: [message], cameUpEmpty: false };
  }

  await recordUsage(userId, response.usage);

  if (response.stop_reason === "max_tokens") {
    const message =
      "Search agent ran out of room before finishing its results — its submission was cut off and discarded.";
    console.error("[searchAndMatchForUser]", message);
    return { found: 0, upserted: 0, scored: 0, errors: [message], cameUpEmpty: true };
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "submit_job_matches",
  );

  if (!toolUse) {
    const message = "Search agent did not return any results this run.";
    console.error("[searchAndMatchForUser]", message, JSON.stringify(response.content));
    return { found: 0, upserted: 0, scored: 0, errors: [message], cameUpEmpty: true };
  }

  const parsed = z.object({ matches: z.array(matchSchema) }).safeParse(toolUse.input);
  if (!parsed.success) {
    const message = `Search agent returned malformed results: ${parsed.error.message}`;
    console.error("[searchAndMatchForUser]", message);
    return { found: 0, upserted: 0, scored: 0, errors: [message], cameUpEmpty: true };
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
      postedAt: parsePostedAt(match.posted_at),
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

  return {
    found: matches.length,
    upserted: upserted.length,
    scored,
    errors,
    cameUpEmpty: matches.length === 0,
  };
}
