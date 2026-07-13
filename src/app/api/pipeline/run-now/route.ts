import { NextResponse } from "next/server";
import { markRunFinished, markRunStarted } from "@/lib/pipeline/runStatus";
import { searchAndMatchForUser } from "@/lib/pipeline/searchAndMatchForUser";
import { sendDigestForUser } from "@/lib/email/sendDigest";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 280;

/**
 * Manual "run now" for the current user — ignores the schedule/due check
 * entirely, since the person clicking the button is explicitly asking for
 * a fresh run right now (used by the dashboard's "Run now" button).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markRunStarted(user.id);
  try {
    const searchResult = await searchAndMatchForUser(user.id);
    const sendResult = await sendDigestForUser(user.id);

    return NextResponse.json({ searchResult, sendResult });
  } finally {
    await markRunFinished(user.id);
  }
}
