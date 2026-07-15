import { eq } from "npm:drizzle-orm";
import { db } from "../_shared/db.ts";
import { users, userSettings } from "../_shared/schema.ts";
import { isDueNow } from "../_shared/schedule.ts";
import { markRunFinished, markRunStarted } from "../_shared/runStatus.ts";
import { searchAndMatchForUser } from "../_shared/searchAndMatchForUser.ts";
import { sendDigestForUser } from "../_shared/sendDigest.ts";
import { sendErrorAlert } from "../_shared/sendErrorAlert.ts";

// Supabase provides this for background work that outlives the HTTP response.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

/**
 * Runs on Supabase Edge Functions (Deno) instead of Vercel so the heavy
 * per-user agent search isn't bound by Vercel Hobby's ~60s function
 * timeout. Triggered hourly by a GitHub Actions scheduled workflow (see
 * .github/workflows/hourly-pipeline.yml) rather than Vercel Cron, since
 * Vercel Hobby cron only fires once a day.
 *
 * Also handles on-demand "Run now" from the app: POST body
 * `{ "userId": "<uuid>", "manual": true }` runs that one user in the
 * background and returns 202 immediately so the Vercel proxy isn't killed
 * mid-search.
 */

async function runSearchAndSend(
  userId: string,
  { scheduled }: { scheduled: boolean },
): Promise<Record<string, unknown>> {
  let errorSummary: string | null = null;
  let result: Record<string, unknown>;
  try {
    const searchResult = await searchAndMatchForUser(userId);
    const sendResult = await sendDigestForUser(userId);
    result = { searchResult, sendResult };
    if (searchResult.errors.length > 0) {
      errorSummary = searchResult.errors.join("; ");
    }
  } catch (error) {
    errorSummary = error instanceof Error ? error.message : String(error);
    result = { error: errorSummary };
  }
  await markRunFinished(userId, { scheduled, error: errorSummary });

  if (errorSummary) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) await sendErrorAlert(user.email, errorSummary);
  }

  return result;
}

async function runForUser(
  userId: string,
  { scheduled }: { scheduled: boolean },
): Promise<Record<string, unknown>> {
  await markRunStarted(userId);
  return runSearchAndSend(userId, { scheduled });
}

Deno.serve(async (req) => {
  const expected = `Bearer ${Deno.env.get("EDGE_FUNCTION_SECRET")}`;
  if (req.headers.get("authorization") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { userId?: string; manual?: boolean } = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  // On-demand manual run for one user (dashboard "Run now").
  if (body.manual && typeof body.userId === "string" && body.userId.length > 0) {
    const userId = body.userId;
    const [settings] = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    if (!settings) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // Mark in-progress BEFORE responding so the dashboard poll never
    // falsely sees "idle" in the gap before background work starts.
    await markRunStarted(userId);

    const work = runSearchAndSend(userId, { scheduled: false });

    // NEVER await the hunt on this request path — if we fall back to await,
    // Vercel Hobby's ~60s limit aborts the call and strands run_started_at.
    if (typeof EdgeRuntime === "undefined" || typeof EdgeRuntime.waitUntil !== "function") {
      await markRunFinished(userId, {
        scheduled: false,
        error: "Background runner unavailable (EdgeRuntime.waitUntil missing).",
      });
      return new Response(
        JSON.stringify({ error: "Background runner unavailable on this runtime." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    EdgeRuntime.waitUntil(work);
    return new Response(JSON.stringify({ started: true, userId }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allSettings = await db.select().from(userSettings);
  const dueSettings = allSettings.filter((settings) => isDueNow(settings));

  // Each user's agent run can take minutes; running them sequentially risks
  // the edge function's wall-clock limit cutting off the tail of the list
  // when several users share a scheduled hour. Run them concurrently —
  // runForUser never throws (errors are captured per user), so allSettled's
  // rejected branch is just a final safety net.
  const outcomes = await Promise.allSettled(
    dueSettings.map((settings) => runForUser(settings.userId, { scheduled: true })),
  );

  const results: Record<string, unknown> = {};
  dueSettings.forEach((settings, i) => {
    const outcome = outcomes[i];
    results[settings.userId] =
      outcome.status === "fulfilled" ? outcome.value : { error: String(outcome.reason) };
  });

  return new Response(JSON.stringify({ usersDue: dueSettings.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
