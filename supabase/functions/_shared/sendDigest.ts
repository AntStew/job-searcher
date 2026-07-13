import { and, desc, eq, gte, isNull, not } from "npm:drizzle-orm";
import { Resend } from "npm:resend";
import { db } from "./db.ts";
import { emailSends, jobMatches, jobs, userSettings, users } from "./schema.ts";
import { renderDigestHtml, type DigestJob } from "./digestEmailHtml.ts";
import { unsubscribeUrl } from "./unsubscribeToken.ts";

const MAX_JOBS_PER_DIGEST = 15;

const WINDOW_HOURS: Record<"daily" | "weekly" | "monthly", number> = {
  daily: 24,
  weekly: 7 * 24,
  monthly: 30 * 24,
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

export type SendDigestResult =
  | { sent: false; reason: "no_matches" | "paused" | "user_not_found" }
  | { sent: true; jobCount: number };

/**
 * Sends (at most) one digest email to a user for every job_match that
 * clears their threshold and hasn't been emailed yet, then marks those
 * matches + the user's last_email_sent_at so the same job is never
 * emailed twice. Kept in sync with src/lib/email/sendDigest.ts.
 */
export async function sendDigestForUser(userId: string): Promise<SendDigestResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

  if (!user || !settings) {
    return { sent: false, reason: "user_not_found" };
  }
  if (settings.emailFrequency === "paused") {
    return { sent: false, reason: "paused" };
  }

  const windowStart = new Date(
    Date.now() - WINDOW_HOURS[settings.emailFrequency] * 60 * 60 * 1000,
  );

  const qualifying = await db
    .select({ match: jobMatches, job: jobs })
    .from(jobMatches)
    .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
    .where(
      and(
        eq(jobMatches.userId, userId),
        gte(jobMatches.score, settings.matchThreshold),
        not(jobMatches.dealbreakerHit),
        isNull(jobMatches.emailedAt),
        gte(jobs.fetchedAt, windowStart),
      ),
    )
    .orderBy(desc(jobMatches.score))
    .limit(MAX_JOBS_PER_DIGEST);

  if (qualifying.length === 0) {
    return { sent: false, reason: "no_matches" };
  }

  const digestJobs: DigestJob[] = qualifying.map(({ match, job }) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    score: match.score,
    reasoning: match.reasoning,
  }));

  const html = renderDigestHtml(digestJobs, unsubscribeUrl(userId));

  const { data, error } = await resend.emails.send({
    from: Deno.env.get("EMAIL_FROM") ?? "Job Search Assistant <jobs@example.com>",
    to: user.email,
    subject: `${digestJobs.length} new job match${digestJobs.length === 1 ? "" : "es"} for you`,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  const now = new Date();
  const matchIds = qualifying.map(({ match }) => match.id);

  await db.transaction(async (tx) => {
    for (const matchId of matchIds) {
      await tx.update(jobMatches).set({ emailedAt: now }).where(eq(jobMatches.id, matchId));
    }
    await tx
      .update(userSettings)
      .set({ lastEmailSentAt: now })
      .where(eq(userSettings.userId, userId));
    await tx.insert(emailSends).values({
      userId,
      sentAt: now,
      jobMatchIds: matchIds,
      resendMessageId: data?.id ?? null,
    });
  });

  return { sent: true, jobCount: digestJobs.length };
}
