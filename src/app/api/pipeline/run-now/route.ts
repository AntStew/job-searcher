import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import {
  hoursUntilManualRunAllowed,
  isRunInProgress,
  markRunFinished,
  markRunStarted,
} from "@/lib/pipeline/runStatus";
import { searchAndMatchForUser } from "@/lib/pipeline/searchAndMatchForUser";
import { sendDigestForUser } from "@/lib/email/sendDigest";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 280;

/**
 * Manual "Run now" for the current user. Fully independent of the scheduled
 * digest: it ignores the schedule, and its success is recorded on
 * lastManualRunAt (not lastRunAt), so clicking it never delays or suppresses
 * the scheduled email. Non-admins get one manual run per 12h so it can't be
 * spammed (each run costs real Anthropic usage).
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
    .select({
      adminLocked: userSettings.adminLocked,
      lastManualRunAt: userSettings.lastManualRunAt,
      runStartedAt: userSettings.runStartedAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  if (settings?.adminLocked) {
    return NextResponse.json(
      { error: "Your account has been paused by the admin." },
      { status: 403 },
    );
  }

  // The dashboard button disables itself while a run is live, but a stale tab
  // (or the scheduled run firing at the same moment) can still double-submit —
  // and each run costs real Anthropic usage.
  if (isRunInProgress(settings?.runStartedAt ?? null)) {
    return NextResponse.json(
      { error: "A search is already running for you — give it a minute." },
      { status: 409 },
    );
  }

  if (!isAdmin) {
    const hoursLeft = hoursUntilManualRunAllowed(settings?.lastManualRunAt ?? null);
    if (hoursLeft > 0) {
      const rounded = Math.ceil(hoursLeft);
      return NextResponse.json(
        {
          error: `You've already used your manual run. Try again in about ${rounded} hour${rounded === 1 ? "" : "s"} — your scheduled email isn't affected.`,
        },
        { status: 429 },
      );
    }
  }

  await markRunStarted(user.id);
  try {
    const searchResult = await searchAndMatchForUser(user.id);
    const sendResult = await sendDigestForUser(user.id);

    // A run that produced only errors doesn't burn the manual cooldown.
    await markRunFinished(user.id, {
      scheduled: false,
      error: searchResult.errors.length > 0 ? searchResult.errors.join("; ") : null,
    });
    return NextResponse.json({ searchResult, sendResult });
  } catch (err) {
    await markRunFinished(user.id, {
      scheduled: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
