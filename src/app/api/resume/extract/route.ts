import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const DOCX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const anthropic = new Anthropic();

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
          },
          {
            type: "text",
            text: "Extract this resume as clean plain text, preserving section headers and structure as plain lines (no markdown, no HTML). Respond with ONLY the extracted resume text, nothing else.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Could not extract text from PDF");
  }
  return textBlock.text.trim();
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

/**
 * Accepts an uploaded PDF or DOCX resume and returns plain text, which the
 * client fills into the same resume_text field the paste-in textarea uses —
 * no new storage. PDFs go through Claude (handles varied layouts/columns);
 * DOCX is extracted directly with mammoth (deterministic, no LLM call needed).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && file.type !== DOCX_MEDIA_TYPE) {
    return NextResponse.json({ error: "Only PDF or DOCX files are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text =
      file.type === "application/pdf" ? await extractFromPdf(buffer) : await extractFromDocx(buffer);

    if (!text) {
      return NextResponse.json({ error: "Could not extract text from that file" }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Could not extract text from that file" }, { status: 422 });
  }
}
