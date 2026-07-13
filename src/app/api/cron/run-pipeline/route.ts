import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { jobPreferences, userSettings } from "@/db/schema";
import { fetchJobsForUser } from "@/lib/pipeline/fetchJobsForUser";
import { isDueToday } from "@/lib/pipeline/isDueToday";
import { runScoringForUser } from "@/lib/scoring/runScoringForUser";
import { sendDigestForUser } from "@/lib/email/sendDigest";

export const maxDuration = 300;

/**
 * Daily Vercel Cron entrypoint. For each user whose email schedule is due
 * today, runs fetch -> score -> send for just that user (search cadence is
 * tied to each user's own schedule, not decoupled from it), then moves on.
 * A failure for one user doesn't stop the others.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allSettings = await db.select().from(userSettings);
  const dueSettings = allSettings.filter((settings) => isDueToday(settings));

  const results: Record<string, unknown> = {};

  for (const settings of dueSettings) {
    try {
      const [preferences] = await db
        .select()
        .from(jobPreferences)
        .where(eq(jobPreferences.userId, settings.userId));

      if (!preferences) {
        results[settings.userId] = { skipped: "no_preferences" };
        continue;
      }

      const fetchResult = await fetchJobsForUser(preferences);
      const scoreResult = await runScoringForUser(settings.userId);
      const sendResult = await sendDigestForUser(settings.userId);

      results[settings.userId] = { fetchResult, scoreResult, sendResult };
    } catch (error) {
      results[settings.userId] = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  return NextResponse.json({ usersDue: dueSettings.length, results });
}
