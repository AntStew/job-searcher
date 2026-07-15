"use client";

import { useState, useTransition } from "react";
import { scoreColor } from "@/lib/scoreColor";
import { select } from "@/lib/ui";
import { setMatchFeedback, setMatchStatus } from "./matchActions";

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
  /** Job was found within the last 24h — gets a "New" marker. */
  isNew?: boolean;
  initialFeedback: Feedback;
  initialStatus: ApplicationStatus;
  /** The tracker shows rows regardless of feedback, so "Not interested" there would just un-hide on refresh. */
  showNotInterested?: boolean;
};

export function MatchRow(props: MatchRowProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(props.initialFeedback);
  const [status, setStatus] = useState<ApplicationStatus>(props.initialStatus);
  const [, startTransition] = useTransition();
  const removable = props.showNotInterested ?? true;

  function handleLiked() {
    const value = feedback === "liked" ? null : "liked"; // tap again to clear
    setFeedback(value);
    startTransition(() => {
      void setMatchFeedback(props.matchId, value);
    });
  }

  // On the dashboard this dislikes AND removes the row (the list filters
  // disliked matches out server-side anyway, so hiding now just skips the
  // wait for the refresh). On the tracker it's a plain dislike toggle.
  function handleNotInterested() {
    if (removable) {
      setDismissed(true);
      startTransition(() => {
        void setMatchFeedback(props.matchId, "disliked");
      });
      return;
    }
    const value = feedback === "disliked" ? null : "disliked";
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
    <li
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        dismissed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      }`}
    >
      <div className="overflow-hidden">
        <div className="py-1">
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
            className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-panel"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {props.isNew && (
                  <span
                    title="Found in the last 24 hours"
                    className="shrink-0 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink"
                  >
                    New
                  </span>
                )}
                <a
                  href={props.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open the job posting"
                  className="font-display group/link inline-flex min-w-0 items-center gap-1 text-sm font-medium text-ink hover:text-accent"
                >
                  <span className="truncate">{props.title}</span>
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 shrink-0 text-muted transition-colors group-hover/link:text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                  >
                    <path d="M4 2h6v6M10 2L3.5 8.5" />
                  </svg>
                </a>
              </div>
              <p className="truncate text-xs text-muted">
                {props.company}
                {props.location ? ` · ${props.location}` : ""}
                {props.salaryText ? ` · ${props.salaryText}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {STATUS_BADGE[status] && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {STATUS_BADGE[status]}
                </span>
              )}
              <span
                title="Match score out of 100"
                className="rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold leading-none text-white"
                style={{ backgroundColor: scoreColor(props.score) }}
              >
                {props.score}
              </span>
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
              <div className="mb-2 flex flex-col gap-3 border-t border-border pt-3 text-sm">
                <p className="leading-relaxed text-ink">{props.reasoning}</p>

                <p className="text-xs text-muted">
                  {props.experienceRequired && <>Experience: {props.experienceRequired} · </>}
                  {props.matchedCriteria.length > 0 && (
                    <>Matched: {props.matchedCriteria.join(", ")} · </>
                  )}
                  Found {props.addedText}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href={props.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-ink/85"
                    >
                      Open job ↗
                    </a>
                    <button
                      type="button"
                      onClick={handleLiked}
                      aria-pressed={feedback === "liked"}
                      title="The agent will hunt for more jobs like this one"
                      className={`transition-colors hover:underline ${
                        feedback === "liked" ? "font-medium text-accent" : "text-muted hover:text-ink"
                      }`}
                    >
                      👍 More like this
                    </button>
                    <button
                      type="button"
                      onClick={handleNotInterested}
                      aria-pressed={!removable && feedback === "disliked"}
                      title={
                        removable
                          ? "Removes it from your list and steers the agent away from jobs like it"
                          : "Steers the agent away from jobs like this one"
                      }
                      className={`transition-colors hover:underline ${
                        !removable && feedback === "disliked"
                          ? "font-medium text-danger"
                          : "text-muted hover:text-danger"
                      }`}
                    >
                      👎 Not interested
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
