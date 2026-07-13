import { db } from "../_shared/db.ts";
import { userSettings } from "../_shared/schema.ts";
import { isDueToday } from "../_shared/isDueToday.ts";
import { markRunFinished, markRunStarted } from "../_shared/runStatus.ts";
import { searchAndMatchForUser } from "../_shared/searchAndMatchForUser.ts";
import { sendDigestForUser } from "../_shared/sendDigest.ts";

/**
 * Runs on Supabase Edge Functions (Deno) instead of Vercel so the heavy
 * per-user agent search isn't bound by Vercel Hobby's ~60s function
 * timeout. Triggered hourly by a GitHub Actions scheduled workflow (see
 * .github/workflows/hourly-pipeline.yml) rather than Vercel Cron, since
 * Vercel Hobby cron only fires once a day.
 */
Deno.serve(async (req) => {
  const expected = `Bearer ${Deno.env.get("EDGE_FUNCTION_SECRET")}`;
  if (req.headers.get("authorization") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const allSettings = await db.select().from(userSettings);
  const dueSettings = allSettings.filter((settings) => isDueToday(settings));

  const results: Record<string, unknown> = {};

  for (const settings of dueSettings) {
    await markRunStarted(settings.userId);
    try {
      const searchResult = await searchAndMatchForUser(settings.userId);
      const sendResult = await sendDigestForUser(settings.userId);
      results[settings.userId] = { searchResult, sendResult };
    } catch (error) {
      results[settings.userId] = { error: error instanceof Error ? error.message : String(error) };
    } finally {
      await markRunFinished(settings.userId);
    }
  }

  return new Response(JSON.stringify({ usersDue: dueSettings.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
