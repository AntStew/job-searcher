import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { markRunFinished, markRunStarted } from "@/lib/pipeline/runStatus";
import { searchAndMatchForUser } from "@/lib/pipeline/searchAndMatchForUser";
import { sendDigestForUser } from "@/lib/email/sendDigest";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 280;

const MANUAL_RUN_COOLDOWN_HOURS = 24;

/**
 * Manual "run now" for the current user — ignores the schedule/due check
 * entirely, since the person clicking the button is explicitly asking for
 * a fresh run right now (used by the dashboard's "Run now" button).
 *
 * Rate-limited to one manual run per day for everyone except the admin, so
 * a manual click and the day's scheduled run share the same one-run
 * allowance rather than stacking (which would double the Anthropic cost
 * for that user that day).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  const [settings] = await db
    .select({ adminLocked: userSettings.adminLocked, lastRunAt: userSettings.lastRunAt })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  if (settings?.adminLocked) {
    return NextResponse.json(
      { error: "Your account has been paused by the admin." },
      { status: 403 },
    );
  }

  if (!isAdmin && settings?.lastRunAt) {
    const hoursSinceLastRun = (Date.now() - settings.lastRunAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastRun < MANUAL_RUN_COOLDOWN_HOURS) {
      const hoursLeft = Math.ceil(MANUAL_RUN_COOLDOWN_HOURS - hoursSinceLastRun);
      return NextResponse.json(
        {
          error: `You've already had your run today. Try again in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`,
        },
        { status: 429 },
      );
    }
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
