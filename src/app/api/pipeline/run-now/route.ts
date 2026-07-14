import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
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

  const [settings] = await db
    .select({ adminLocked: userSettings.adminLocked })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  if (settings?.adminLocked) {
    return NextResponse.json(
      { error: "Your account has been paused by the admin." },
      { status: 403 },
    );
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
