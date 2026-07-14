import { eq } from "npm:drizzle-orm";
import { db } from "../_shared/db.ts";
import { users, userSettings } from "../_shared/schema.ts";
import { isDueToday } from "../_shared/isDueToday.ts";
import { markRunFinished, markRunStarted } from "../_shared/runStatus.ts";
import { searchAndMatchForUser } from "../_shared/searchAndMatchForUser.ts";
import { sendDigestForUser } from "../_shared/sendDigest.ts";
import { sendErrorAlert } from "../_shared/sendErrorAlert.ts";

/**
 * Runs on Supabase Edge Functions (Deno) instead of Vercel so the heavy
 * per-user agent search isn't bound by Vercel Hobby's ~60s function
 * timeout. Triggered hourly by a GitHub Actions scheduled workflow (see
 * .github/workflows/hourly-pipeline.yml) rather than Vercel Cron, since
 * Vercel Hobby cron only fires once a day.
 */

async function runForUser(userId: string): Promise<Record<string, unknown>> {
  await markRunStarted(userId);
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
  await markRunFinished(userId, errorSummary);

  if (errorSummary) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) await sendErrorAlert(user.email, errorSummary);
  }

  return result;
}

Deno.serve(async (req) => {
  const expected = `Bearer ${Deno.env.get("EDGE_FUNCTION_SECRET")}`;
  if (req.headers.get("authorization") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const allSettings = await db.select().from(userSettings);
  const dueSettings = allSettings.filter((settings) => isDueToday(settings));

  // Each user's agent run can take minutes; running them sequentially risks
  // the edge function's wall-clock limit cutting off the tail of the list
  // when several users share a scheduled hour. Run them concurrently —
  // runForUser never throws (errors are captured per user), so allSettled's
  // rejected branch is just a final safety net.
  const outcomes = await Promise.allSettled(
    dueSettings.map((settings) => runForUser(settings.userId)),
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
