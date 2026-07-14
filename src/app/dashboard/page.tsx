import { and, desc, eq, gte, isNull, ne, not, or, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobMatches, jobs, userSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { nextDueDate } from "@/lib/pipeline/isDueToday";
import { isRunInProgress } from "@/lib/pipeline/runStatus";
import { thresholdLabel } from "@/lib/matchThreshold";
import { MAX_JOBS_PER_DIGEST, WINDOW_HOURS } from "@/lib/email/digestWindow";
import { pickTaunt, TAUNT_EMOJIS } from "@/lib/taunts";
import { card } from "@/lib/ui";
import { RunNowButton } from "./RunNowButton";
import { MatchSortSelect } from "./MatchSortSelect";
import { MatchRow } from "./MatchRow";

const SORT_OPTIONS = {
  score: desc(jobMatches.score),
  date: desc(jobs.fetchedAt),
  salary: sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}, 0) desc`,
} as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  paused: "Paused",
};

function randomEmoji(): string {
  return TAUNT_EMOJIS[Math.floor(Math.random() * TAUNT_EMOJIS.length)];
}

function formatDateTime(date: Date | null): string {
  if (!date) return "Never yet";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortOrder = SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS] ?? SORT_OPTIONS.score;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // These three don't depend on each other, so fire them together instead
  // of paying for each round-trip to the DB in sequence.
  const [[settings], allMatches, recentMatches] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
    db
      .select({
        id: jobMatches.id,
        applicationStatus: jobMatches.applicationStatus,
        scoredAt: jobMatches.scoredAt,
      })
      .from(jobMatches)
      .where(eq(jobMatches.userId, user.id)),
    db
      .select({ match: jobMatches, job: jobs })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
      .where(
        and(
          eq(jobMatches.userId, user.id),
          // "Not interested" (thumbs-down) removes a match from this list.
          or(isNull(jobMatches.feedback), ne(jobMatches.feedback, "disliked")),
        ),
      )
      .orderBy(sortOrder)
      .limit(20),
  ]);

  if (settings && !settings.onboardedAt) {
    redirect("/onboarding");
  }

  // Mirrors sendDigest's exact filters (threshold, dealbreaker, not yet
  // emailed, freshness window, 15-job cap) so this number matches what the
  // next email will actually contain.
  const readyToSend =
    settings && settings.emailFrequency !== "paused"
      ? await db
          .select({ id: jobMatches.id })
          .from(jobMatches)
          .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
          .where(
            and(
              eq(jobMatches.userId, user.id),
              gte(jobMatches.score, settings.matchThreshold),
              not(jobMatches.dealbreakerHit),
              or(isNull(jobMatches.feedback), ne(jobMatches.feedback, "disliked")),
              isNull(jobMatches.emailedAt),
              gte(
                jobs.fetchedAt,
                new Date(Date.now() - WINDOW_HOURS[settings.emailFrequency] * 60 * 60 * 1000),
              ),
            ),
          )
          .limit(MAX_JOBS_PER_DIGEST)
      : [];

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const taunt = pickTaunt({
    totalMatches: allMatches.length,
    readyToSend: readyToSend.length,
    appliedCount: allMatches.filter((m) =>
      ["applied", "interviewing", "offer"].includes(m.applicationStatus),
    ).length,
    newThisWeek: allMatches.filter((m) => m.scoredAt >= weekAgo).length,
  });

  const agentRunning = settings ? isRunInProgress(settings.runStartedAt) : false;
  const next = settings ? nextDueDate(settings) : null;
  const nextRunText = !settings
    ? "—"
    : settings.emailFrequency === "paused"
      ? "Paused"
      : next && next.getTime() <= Date.now()
        ? "Due now"
        : formatDateTime(next);

  return (
    <div className="flex flex-col gap-6">
      <p className="font-display text-2xl font-extrabold tracking-tight text-black sm:text-3xl">
        {randomEmoji()} {taunt} {randomEmoji()}
      </p>
      <div className={`${card} flex flex-col gap-4`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Last run" value={formatDateTime(settings?.lastRunAt ?? null)} />
          <Stat label="Next run" value={nextRunText} />
          <Stat label="Total matches" value={String(allMatches.length)} />
          <Stat
            label="Ready to send"
            value={settings?.emailFrequency === "paused" ? "—" : String(readyToSend.length)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Emailing <span className="font-medium text-ink">{FREQUENCY_LABEL[settings?.emailFrequency ?? "weekly"]}</span>
            {" · "}threshold <span className="font-medium text-ink">{thresholdLabel(settings?.matchThreshold ?? 60)}</span>.
            Change this in{" "}
            <Link href="/dashboard/settings" className="text-accent underline underline-offset-2">
              Settings
            </Link>
            .
          </p>
          <RunNowButton serverRunning={agentRunning} />
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Recent matches</h2>
          {recentMatches.length > 0 && <MatchSortSelect />}
        </div>
        {recentMatches.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing scored yet. Make sure your{" "}
            <Link href="/dashboard/settings" className="text-accent underline underline-offset-2">
              resume and preferences
            </Link>{" "}
            are filled in, then hit Run now above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {recentMatches.map(({ match, job }) => (
              <MatchRow
                key={match.id}
                matchId={match.id}
                title={job.title}
                company={job.company}
                url={job.url}
                location={job.location}
                salaryText={formatSalary(job.salaryMin, job.salaryMax)}
                addedText={formatDate(job.fetchedAt)}
                score={match.score}
                reasoning={match.reasoning}
                matchedCriteria={match.matchedCriteria}
                experienceRequired={job.experienceRequired}
                dealbreakerHit={match.dealbreakerHit}
                initialFeedback={match.feedback}
                initialStatus={match.applicationStatus}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}
