"use client";

import { useState, useTransition } from "react";
import { setMatchFeedback, setMatchStatus } from "./matchActions";
import { select } from "@/lib/ui";

type Feedback = "liked" | "disliked" | null;
type ApplicationStatus = "none" | "interested" | "applied" | "interviewing" | "rejected" | "offer";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "none", label: "No status" },
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "rejected", label: "Rejected" },
  { value: "offer", label: "Offer 🎉" },
];

const STATUS_BADGE: Partial<Record<ApplicationStatus, string>> = {
  interested: "Interested",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer 🎉",
};

export type MatchRowProps = {
  matchId: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  salaryText: string | null;
  addedText: string;
  score: number;
  reasoning: string;
  matchedCriteria: string[];
  experienceRequired: string | null;
  dealbreakerHit: boolean;
  emailed: boolean;
  initialFeedback: Feedback;
  initialStatus: ApplicationStatus;
};

export function MatchRow(props: MatchRowProps) {
  const [feedback, setFeedback] = useState<Feedback>(props.initialFeedback);
  const [status, setStatus] = useState<ApplicationStatus>(props.initialStatus);
  const [, startTransition] = useTransition();

  function handleFeedback(next: Exclude<Feedback, null>) {
    const value = feedback === next ? null : next; // tap again to clear
    setFeedback(value);
    startTransition(() => {
      void setMatchFeedback(props.matchId, value);
    });
  }

  function handleStatus(next: ApplicationStatus) {
    setStatus(next);
    startTransition(() => {
      void setMatchStatus(props.matchId, next);
    });
  }

  return (
    <li className="py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <a
              href={props.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-ink hover:text-accent"
            >
              {props.title}
            </a>
            <p className="truncate text-xs text-muted">
              {props.company}
              {props.location ? ` · ${props.location}` : ""}
              {props.salaryText ? ` · ${props.salaryText}` : ""}
              {` · Added ${props.addedText}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {STATUS_BADGE[status] && (
              <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-medium text-ink">
                {STATUS_BADGE[status]}
              </span>
            )}
            {props.dealbreakerHit && (
              <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                Dealbreaker
              </span>
            )}
            {props.emailed && (
              <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-muted">
                Sent
              </span>
            )}
            <span
              title="Match score out of 100"
              className="flex flex-col items-center rounded-lg bg-accent-soft px-2.5 py-1 leading-none"
            >
              <span className="text-sm font-semibold text-ink">{props.score}</span>
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

        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-bg p-3 text-sm">
          <p className="text-ink">{props.reasoning}</p>
          {props.experienceRequired && (
            <p className="text-xs text-muted">
              <span className="font-medium text-ink">Experience: </span>
              {props.experienceRequired}
            </p>
          )}
          {props.matchedCriteria.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {props.matchedCriteria.map((criterion) => (
                <span
                  key={criterion}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted"
                >
                  {criterion}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">More like this?</span>
              <button
                type="button"
                onClick={() => handleFeedback("liked")}
                aria-pressed={feedback === "liked"}
                title="More jobs like this"
                className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                  feedback === "liked"
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface"
                }`}
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("disliked")}
                aria-pressed={feedback === "disliked"}
                title="Fewer jobs like this"
                className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                  feedback === "disliked"
                    ? "border-danger bg-danger/10"
                    : "border-border hover:bg-surface"
                }`}
              >
                👎
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              Status
              <select
                value={status}
                onChange={(e) => handleStatus(e.target.value as ApplicationStatus)}
                className={`${select} w-auto py-1 text-xs`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </details>
    </li>
  );
}
