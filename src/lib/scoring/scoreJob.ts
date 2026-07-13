import Anthropic from "@anthropic-ai/sdk";
import type { jobPreferences, jobs } from "@/db/schema";

const anthropic = new Anthropic();

type Preferences = typeof jobPreferences.$inferSelect;
type Job = typeof jobs.$inferSelect;

export type JobScore = {
  score: number;
  reasoning: string;
  matchedCriteria: string[];
  dealbreakerHit: boolean;
};

const SUBMIT_SCORE_TOOL: Anthropic.Tool = {
  name: "submit_match_score",
  description: "Submit the match score for how well this job fits the candidate.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description: "0-100 match quality, where 100 is a perfect fit.",
      },
      reasoning: {
        type: "string",
        description: "1-3 sentence explanation of the score, written for the candidate to read.",
      },
      matched_criteria: {
        type: "array",
        items: { type: "string" },
        description: "Short list of specific preferences/resume points this job satisfies.",
      },
      dealbreaker_hit: {
        type: "boolean",
        description: "True if the job clearly violates one of the candidate's stated dealbreakers.",
      },
    },
    required: ["score", "reasoning", "matched_criteria", "dealbreaker_hit"],
  },
};

export async function scoreJob(
  resumeText: string,
  preferences: Preferences,
  job: Job,
): Promise<JobScore> {
  const prompt = `Score how well this job matches the candidate, from 0-100.

# Candidate resume
${resumeText}

# Candidate preferences
Desired roles: ${preferences.desiredRoles.join(", ") || "(none specified)"}
Locations: ${preferences.locations.join(", ") || "(none specified)"}
Remote preference: ${preferences.remotePreference}
Minimum salary: ${preferences.salaryMin ?? "(none specified)"}
Industries: ${preferences.industries.join(", ") || "(none specified)"}
Must-haves: ${preferences.mustHaves || "(none specified)"}
Dealbreakers: ${preferences.dealbreakers || "(none specified)"}

# Job posting
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? "(unspecified)"}
Salary: ${job.salaryMin ?? "?"} - ${job.salaryMax ?? "?"}
Description:
${job.descriptionText.slice(0, 6000)}

Call submit_match_score with your assessment.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [SUBMIT_SCORE_TOOL],
    tool_choice: { type: "tool", name: "submit_match_score" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Model did not return a submit_match_score tool call");
  }

  const input = toolUse.input as {
    score: number;
    reasoning: string;
    matched_criteria: string[];
    dealbreaker_hit: boolean;
  };

  return {
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    reasoning: input.reasoning,
    matchedCriteria: input.matched_criteria,
    dealbreakerHit: input.dealbreaker_hit,
  };
}
