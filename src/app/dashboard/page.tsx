import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobMatches, jobs, userSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { nextDueDate } from "@/lib/pipeline/schedule";
import { isRunInProgress } from "@/lib/pipeline/runStatus";
import { thresholdLabel } from "@/lib/matchThreshold";
import { formatDate, formatDateTime, formatSalary } from "@/lib/format";
import { pickTaunt, TAUNT_EMOJIS } from "@/lib/taunts";
import { WEEKDAY_OPTIONS } from "@/lib/timezone";
import { card } from "@/lib/ui";
import { RunNowButton } from "./RunNowButton";
import { MatchSortSelect } from "./MatchSortSelect";
import { MatchRow } from "./MatchRow";

const SORT_OPTIONS = {
  score: desc(jobMatches.score),
  date: desc(jobs.fetchedAt),
  salary: sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}, 0) desc`,
} as const;

type Settings = typeof userSettings.$inferSelect;

function randomEmoji(): string {
  return TAUNT_EMOJIS[Math.floor(Math.random() * TAUNT_EMOJIS.length)];
}

/** "daily at 7 AM" / "Mondays at 8 AM" / "monthly on day 1" — shown under Next email. */
function scheduleHint(settings: Settings | undefined): string {
  if (!settings || settings.emailFrequency === "paused") return "emails are paused";
  const hour = new Date(2000, 0, 1, settings.scheduleHour).toLocaleTimeString(undefined, {
    hour: "numeric",
  });
  if (settings.emailFrequency === "daily") return `daily at ${hour}`;
  if (settings.emailFrequency === "weekly") {
    return `${WEEKDAY_OPTIONS[settings.scheduleDayOfWeek].label}s at ${hour}`;
  }
  return `monthly on day ${settings.scheduleDayOfMonth}, ${hour}`;
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

  // These don't depend on each other, so fire them together instead of
  // paying for each round-trip to the DB in sequence.
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

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const appliedCount = allMatches.filter((m) =>
    ["applied", "interviewing", "offer"].includes(m.applicationStatus),
  ).length;
  const newThisWeek = allMatches.filter((m) => m.scoredAt >= weekAgo).length;

  const taunt = pickTaunt({
    totalMatches: allMatches.length,
    appliedCount,
    newThisWeek,
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
      <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        <span>{randomEmoji()}</span> <span className="text-loot">{taunt}</span>{" "}
        <span>{randomEmoji()}</span>
      </p>
      <div className={`${card} flex flex-col gap-5`}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat
            label="Last search"
            value={formatDateTime(settings?.lastRunAt ?? null)}
            hint="the agent's last shift"
          />
          <Stat label="Next email" value={nextRunText} hint={scheduleHint(settings)} highlight />
          <Stat
            label="New this week"
            value={String(newThisWeek)}
            hint="fresh jobs. no excuses"
          />
          <Stat
            label="Applications"
            value={String(appliedCount)}
            hint="see them in Tracker →"
            href="/dashboard/tracker"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Picky level:{" "}
            <span className="font-medium text-ink">{thresholdLabel(settings?.matchThreshold ?? 60)}</span> —
            change it (or your schedule) in{" "}
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
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            Recent matches
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
              {allMatches.length} total
            </span>
          </h2>
          {recentMatches.length > 0 && <MatchSortSelect />}
        </div>
        {recentMatches.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing here yet — the agent can&apos;t match air. Fill in your{" "}
            <Link href="/dashboard/settings" className="text-accent underline underline-offset-2">
              resume and preferences
            </Link>
            , then hit Run now above. LLLOOOCCCKKK IIIINNNNN.
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
                isNew={job.fetchedAt >= dayAgo}
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

function Stat({
  label,
  value,
  hint,
  href,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display text-lg font-semibold ${highlight ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted/80">{hint}</p>}
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="-m-2 rounded-lg p-2 transition-colors hover:bg-accent-soft/50"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
