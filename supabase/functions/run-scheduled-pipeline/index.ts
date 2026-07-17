import { eq } from "npm:drizzle-orm";
import { db } from "../_shared/db.ts";
import { users, userSettings } from "../_shared/schema.ts";
import { isDueNow } from "../_shared/schedule.ts";
import { markRunFinished, markRunStarted } from "../_shared/runStatus.ts";
import { searchAndMatchForUser, type SearchAndMatchResult } from "../_shared/searchAndMatchForUser.ts";
import { sendDigestForUser, type SendDigestResult } from "../_shared/sendDigest.ts";
import { sendEmptyRunEmail, sendErrorAlert } from "../_shared/sendErrorAlert.ts";

// Supabase provides this for background work that outlives the HTTP response.
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

/**
 * Runs on Supabase Edge Functions (Deno) instead of Vercel so the heavy
 * per-user agent search isn't bound by Vercel Hobby's ~60s function
 * timeout. Triggered twice an hour (GitHub Actions cron and/or pg_cron)
 * rather than Vercel Cron, since Vercel Hobby cron only fires once a day.
 *
 * Request shapes (all POST, all authed by EDGE_FUNCTION_SECRET bearer):
 * - `{}` — batch: find due users and dispatch one self-request per user so
 *   each run gets its own worker and wall-clock budget
 * - `{ "userId": "<uuid>" }` — scheduled run for one user (dispatched by
 *   the batch path)
 * - `{ "userId": "<uuid>", "manual": true }` — on-demand "Run now" from
 *   the app
 * Single-user runs return 202 immediately and finish in the background.
 */

/**
 * A lock younger than this means a run is genuinely in progress — a second
 * trigger firing early must not double-run the user. Older means the worker
 * died mid-run (the search self-times-out at 4 min, so nothing legitimate
 * lives this long); the batch path clears it so the slot can retry.
 */
const RUN_GUARD_MINUTES = 10;

async function getUserEmail(userId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user?.email ?? null;
}

async function runSearchAndSend(
  userId: string,
  { scheduled }: { scheduled: boolean },
): Promise<Record<string, unknown>> {
  let searchResult: SearchAndMatchResult | null = null;
  let searchError: string | null = null;
  try {
    searchResult = await searchAndMatchForUser(userId);
  } catch (error) {
    searchError = error instanceof Error ? error.message : String(error);
  }

  // The digest goes out even when the search failed — matches found on
  // earlier runs may still be waiting to be emailed.
  let sendResult: SendDigestResult | null = null;
  let sendError: string | null = null;
  try {
    sendResult = await sendDigestForUser(userId);
  } catch (error) {
    sendError = error instanceof Error ? error.message : String(error);
  }

  const errorSummary =
    [searchError, ...(searchResult?.errors ?? []), sendError].filter(Boolean).join("; ") || null;
  const digestSent = sendResult?.sent === true;
  const benignEmpty = searchResult?.cameUpEmpty === true && !searchError && !sendError;

  // A scheduled run that merely came up empty counts as delivered: leaving
  // it marked failed would make every retry in the catch-up window re-search
  // and re-email "nothing found" until the window closes.
  const treatAsSuccess = errorSummary === null || (scheduled && benignEmpty);
  await markRunFinished(userId, { scheduled, error: treatAsSuccess ? null : errorSummary });

  if (scheduled && benignEmpty && !digestSent) {
    const email = await getUserEmail(userId);
    if (email) await sendEmptyRunEmail(email);
  } else if (errorSummary && !benignEmpty) {
    // Hard failures only. Manual benign-empty runs skip both emails — the
    // dashboard the user is already looking at reports the outcome.
    const email = await getUserEmail(userId);
    if (email) await sendErrorAlert(email, errorSummary);
  }

  return { searchResult: searchResult ?? { error: searchError }, sendResult, errorSummary };
}

function hasBackgroundRunner(): boolean {
  return typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function";
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("EDGE_FUNCTION_SECRET");
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
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

  // Single-user run: manual "Run now" from the app, or a scheduled child
  // dispatched by the batch path below.
  if (typeof body.userId === "string" && body.userId.length > 0) {
    const userId = body.userId;
    const scheduled = !body.manual;
    const [settings] = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    if (!settings) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // Mark in-progress first so the dashboard poll sees "running" right away.
    await markRunStarted(userId);

    // Run INLINE, attached to this request. Background (EdgeRuntime.waitUntil)
    // work gets CPU-starved on this runtime: the identical agent call finishes
    // in ~60s locally and inline, but times out even at 120s in background.
    // Callers must tolerate this response taking a couple of minutes.
    const result = await runSearchAndSend(userId, { scheduled });
    return new Response(JSON.stringify({ userId, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const allSettings = await db.select().from(userSettings);
  const now = Date.now();
  const guardMs = RUN_GUARD_MINUTES * 60 * 1000;

  // Watchdog: a lock older than the guard means a worker died mid-run and
  // recorded nothing. Clear it (and note why) so the slot can retry.
  for (const settings of allSettings) {
    if (settings.runStartedAt && now - settings.runStartedAt.getTime() >= guardMs) {
      await markRunFinished(settings.userId, {
        scheduled: true,
        error: "Previous scheduled search was interrupted before finishing.",
      });
      settings.runStartedAt = null;
    }
  }

  const dueSettings = allSettings.filter(
    (settings) =>
      isDueNow(settings) &&
      // Skip anyone with a live run — overlapping cron fires must not
      // double-run (and double-email) the same user.
      !(settings.runStartedAt && now - settings.runStartedAt.getTime() < guardMs),
  );

  if (dueSettings.length === 0) {
    return new Response(JSON.stringify({ usersDue: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Dispatch one self-request per due user: each child runs its user INLINE
  // on its own worker at full request priority (background tasks get starved
  // — see the single-user path above). The child's response only arrives
  // after its whole run, so DON'T await it: park the fetch in waitUntil to
  // keep the socket alive and answer the cron trigger immediately.
  const selfUrl = Deno.env.get("SUPABASE_URL")
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-scheduled-pipeline`
    : null;

  const results: Record<string, string> = {};

  if (selfUrl && hasBackgroundRunner()) {
    for (const settings of dueSettings) {
      const child = fetch(selfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: settings.userId }),
      }).catch((error) => {
        console.error(`[batch] dispatch failed for ${settings.userId}:`, error);
      });
      EdgeRuntime.waitUntil(child);
      results[settings.userId] = "dispatched";
    }
    return new Response(JSON.stringify({ usersDue: dueSettings.length, results }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  // No self-dispatch available (e.g. local `supabase functions serve`):
  // run everyone inline on this worker, concurrently.
  await Promise.all(
    dueSettings.map(async (settings) => {
      await markRunStarted(settings.userId);
      const outcome = await runSearchAndSend(settings.userId, { scheduled: true });
      results[settings.userId] = outcome.errorSummary ? "failed" : "ok";
    }),
  );

  return new Response(JSON.stringify({ usersDue: dueSettings.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
