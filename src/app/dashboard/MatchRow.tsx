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
  initialFeedback: Feedback;
  initialStatus: ApplicationStatus;
  /** The tracker shows rows regardless of feedback, so hiding one there would just un-hide on refresh. */
  showNotInterested?: boolean;
};

export function MatchRow(props: MatchRowProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
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

  function handleNotInterested(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed(true);
    startTransition(() => {
      void setMatchFeedback(props.matchId, "disliked");
    });
  }

  function handleStatus(next: ApplicationStatus) {
    setStatus(next);
    startTransition(() => {
      void setMatchStatus(props.matchId, next);
    });
  }

  return (
    <li
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        dismissed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      }`}
    >
      <div className="overflow-hidden">
        <div className="py-3">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return; // key events on inner buttons/links
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((v) => !v);
              }
            }}
            className="flex cursor-pointer flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <a
                href={props.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
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
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
              <span
                title="Match score out of 100"
                className="flex flex-col items-center rounded-lg bg-accent-soft px-2.5 py-1 leading-none"
              >
                <span className="text-sm font-semibold text-ink">{props.score}</span>
                <span className="text-[9px] uppercase tracking-wide text-muted">match</span>
              </span>
              {(props.showNotInterested ?? true) && (
                <button
                  type="button"
                  onClick={handleNotInterested}
                  title="Not interested — remove from this list"
                  aria-label="Not interested — remove from this list"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  ✕
                </button>
              )}
              <svg
                viewBox="0 0 20 20"
                className={`h-4 w-4 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <path d="M5.5 7.5L10 12l4.5-4.5" />
              </svg>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
