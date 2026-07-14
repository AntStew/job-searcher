import { desc, eq, ne, and } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobMatches, jobs } from "@/db/schema";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { card } from "@/lib/ui";
import { MatchRow } from "../MatchRow";

// Display order: closest-to-hired first.
const STATUS_SECTIONS = [
  { status: "offer", label: "Offers 🎉" },
  { status: "interviewing", label: "Interviewing" },
  { status: "applied", label: "Applied" },
  { status: "interested", label: "Interested" },
  { status: "rejected", label: "Rejected" },
] as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}

/**
 * Every match the user has put a status on, grouped by where it is in the
 * pipeline — the dashboard only shows the 20 most recent matches, so this is
 * the one place to see everything you're actually pursuing.
 */
export default async function TrackerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const tracked = await db
    .select({ match: jobMatches, job: jobs })
    .from(jobMatches)
    .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
    .where(and(eq(jobMatches.userId, user.id), ne(jobMatches.applicationStatus, "none")))
    .orderBy(desc(jobMatches.scoredAt));

  const sections = STATUS_SECTIONS.map((section) => ({
    ...section,
    rows: tracked.filter(({ match }) => match.applicationStatus === section.status),
  })).filter((section) => section.rows.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Application tracker</h1>
        <p className="text-sm text-muted">
          Everything you&apos;ve marked a status on, closest-to-hired first.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className={card}>
          <p className="text-sm text-muted">
            Nothing tracked yet. Set a status on a match (Interested, Applied, …) from the{" "}
            <Link href="/dashboard" className="text-accent underline underline-offset-2">
              matches list
            </Link>{" "}
            and it&apos;ll show up here. Yes that means you have to actually apply to something.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.status} className={card}>
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              {section.label}
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink">
                {section.rows.length}
              </span>
            </h2>
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {section.rows.map(({ match, job }) => (
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
                  showNotInterested={false}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
