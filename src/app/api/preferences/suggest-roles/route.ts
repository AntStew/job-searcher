import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const anthropic = new Anthropic();

const SUGGEST_ROLES_TOOL: Anthropic.Tool = {
  name: "suggest_roles",
  description: "Suggest job titles/roles this candidate should search for based on their resume.",
  input_schema: {
    type: "object",
    properties: {
      roles: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 6,
        description:
          "3-6 specific job titles this candidate is well qualified for, ordered best-fit first (e.g. 'Senior Product Manager', not just 'Product').",
      },
    },
    required: ["roles"],
  },
};

/**
 * Suggests desired job titles for a user by reading their resume text —
 * used by the "Suggest roles from resume" button next to the Desired
 * Roles field. Takes resumeText directly from the request body rather
 * than the DB, so it works on unsaved edits/uploads too.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resumeText } = (await request.json()) as { resumeText?: string };
  if (!resumeText || resumeText.trim().length < 20) {
    return NextResponse.json({ error: "Add your resume text first" }, { status: 400 });
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    tools: [SUGGEST_ROLES_TOOL],
    tool_choice: { type: "tool", name: "suggest_roles" },
    messages: [
      {
        role: "user",
        content: `Based on this resume, suggest the best job titles for this person to search for.\n\n${resumeText.slice(0, 8000)}\n\nCall suggest_roles with your recommendation.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    return NextResponse.json({ error: "Could not generate suggestions" }, { status: 502 });
  }

  const input = toolUse.input as { roles: string[] };
  return NextResponse.json({ roles: input.roles });
}
