import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import {
  hoursUntilManualRunAllowed,
  isRunInProgress,
} from "@/lib/pipeline/runStatus";
import { createClient } from "@/lib/supabase/server";

/**
 * Manual "Run now" for the current user.
 *
 * IMPORTANT: the search itself does NOT run on Vercel. Hobby plans kill
 * functions around ~60s, and a Sonnet + web_search hunt often takes minutes —
 * that was stranding `run_started_at` and freezing the button. Instead we
 * auth/cooldown-check here, then kick the Supabase edge function (same one
 * the hourly cron uses) with `{ userId, manual: true }`, which returns 202
 * and finishes the hunt in the background.
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

  const edgeSecret = process.env.EDGE_FUNCTION_SECRET;
  const edgeUrl =
    process.env.SUPABASE_FUNCTION_URL ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-scheduled-pipeline`
      : null);

  if (!edgeSecret || !edgeUrl) {
    return NextResponse.json(
      {
        error:
          "Run now isn't configured (missing EDGE_FUNCTION_SECRET or SUPABASE_FUNCTION_URL).",
      },
      { status: 500 },
    );
  }

  let edgeRes: Response;
  try {
    edgeRes = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${edgeSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id, manual: true }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not reach the search runner: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 502 },
    );
  }

  const data = (await edgeRes.json().catch(() => ({}))) as {
    error?: string;
    started?: boolean;
  };

  if (!edgeRes.ok) {
    return NextResponse.json(
      { error: data.error ?? "Search runner refused the request." },
      { status: edgeRes.status },
    );
  }

  return NextResponse.json({ started: true }, { status: 202 });
}
