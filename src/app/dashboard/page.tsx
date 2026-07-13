import { and, desc, eq, gte, isNull, not, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobMatches, jobs, userSettings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { nextDueDate } from "@/lib/pipeline/isDueToday";
import { isRunInProgress } from "@/lib/pipeline/runStatus";
import { thresholdLabel } from "@/lib/matchThreshold";
import { card } from "@/lib/ui";
import { RunNowButton } from "./RunNowButton";
import { MatchSortSelect } from "./MatchSortSelect";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));

  const allMatches = await db
    .select({ id: jobMatches.id })
    .from(jobMatches)
    .where(eq(jobMatches.userId, user.id));

  const readyToSend = settings
    ? await db
        .select({ id: jobMatches.id })
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.userId, user.id),
            gte(jobMatches.score, settings.matchThreshold),
            not(jobMatches.dealbreakerHit),
            isNull(jobMatches.emailedAt),
          ),
        )
    : [];

  const recentMatches = await db
    .select({ match: jobMatches, job: jobs })
    .from(jobMatches)
    .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
    .where(eq(jobMatches.userId, user.id))
    .orderBy(sortOrder)
    .limit(20);

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
      <div className={`${card} flex flex-col gap-4`}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Last run" value={formatDateTime(settings?.lastRunAt ?? null)} />
          <Stat label="Next run" value={nextRunText} />
          <Stat label="Total matches" value={String(allMatches.length)} />
          <Stat label="Ready to send" value={String(readyToSend.length)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Emailing <span className="font-medium text-ink">{FREQUENCY_LABEL[settings?.emailFrequency ?? "weekly"]}</span>
            {" · "}threshold <span className="font-medium text-ink">{thresholdLabel(settings?.matchThreshold ?? 60)}</span>.
            Change this in{" "}
            <a href="/dashboard/settings" className="text-accent underline underline-offset-2">
              Settings
            </a>
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
            <a href="/dashboard/settings" className="text-accent underline underline-offset-2">
              resume and preferences
            </a>{" "}
            are filled in, then hit Run now above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {recentMatches.map(({ match, job }) => (
              <MatchRow key={match.id} match={match} job={job} />
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

type Match = typeof jobMatches.$inferSelect;
type Job = typeof jobs.$inferSelect;

function MatchRow({ match, job }: { match: Match; job: Job }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <li className="py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-ink hover:text-accent"
            >
              {job.title}
            </a>
            <p className="truncate text-xs text-muted">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {salary ? ` · ${salary}` : ""}
              {` · Added ${formatDate(job.fetchedAt)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {match.dealbreakerHit && (
              <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                Dealbreaker
              </span>
            )}
            <span
              title="Match score out of 100"
              className="flex flex-col items-center rounded-lg bg-accent-soft px-2.5 py-1 leading-none"
            >
              <span className="text-sm font-semibold text-ink">{match.score}</span>
              <span className="text-[9px] uppercase tracking-wide text-muted">match</span>
            </span>
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 text-muted transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path d="M5.5 7.5L10 12l4.5-4.5" />
            </svg>
          </div>
        </summary>

        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-bg p-3 text-sm">
          <p className="text-ink">{match.reasoning}</p>
          {job.experienceRequired && (
            <p className="text-xs text-muted">
              <span className="font-medium text-ink">Experience: </span>
              {job.experienceRequired}
            </p>
          )}
          {match.matchedCriteria.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {match.matchedCriteria.map((criterion) => (
                <span
                  key={criterion}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted"
                >
                  {criterion}
                </span>
              ))}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
