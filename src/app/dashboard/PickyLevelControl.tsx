"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closestThreshold, ThresholdPicker } from "@/components/ThresholdPicker";
import { buttonPrimary } from "@/lib/ui";
import { setMatchThreshold } from "./actions";

type RunResult = {
  searchResult: { found: number; upserted: number; scored: number; errors: string[] };
  sendResult:
    | { sent: true; jobCount: number }
    | { sent: false; reason: "no_matches" | "paused" | "user_not_found" };
};

const REASON_TEXT: Record<string, string> = {
  no_matches: "Nothing cleared your bar this run. The bar stays UP.",
  paused: "Emails are paused — matches still saved tho.",
  user_not_found: "Something went wrong finding your account.",
};

export function PickyLevelControl({
  initialThreshold,
  serverRunning = false,
}: {
  initialThreshold: number;
  serverRunning?: boolean;
}) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(() => closestThreshold(initialThreshold));
  const [thresholdPending, startThresholdTransition] = useTransition();
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const runBusy = running || serverRunning;
  const showingRunStatus = running || !!runResult || !!runError || (serverRunning && !running);

  function handleThresholdChange(value: number) {
    const previous = threshold;
    setThreshold(value);
    setThresholdError(null);
    setRunResult(null);
    setRunError(null);
    startThresholdTransition(async () => {
      const result = await setMatchThreshold(value);
      if (!result.ok) {
        setThreshold(previous);
        setThresholdError(result.error);
      }
    });
  }

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const res = await fetch("/api/pipeline/run-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error ?? "Run failed.");
        return;
      }
      setRunResult(data);
      router.refresh();
    } catch {
      setRunError("Something went wrong running the search.");
    } finally {
      setRunning(false);
    }
  }

  const runFooter = showingRunStatus ? (
    <div className="flex flex-col gap-1 text-sm">
      {running && <p className="text-muted">Hunting… hang tight.</p>}
      {serverRunning && !running && (
        <p className="text-muted">Already hunting (probably the scheduled run) — hang tight.</p>
      )}
      {runError && <p className="text-danger">{runError}</p>}
      {runResult && (
        <p className="text-muted">
          The agent dug up {runResult.searchResult.found} job
          {runResult.searchResult.found === 1 ? "" : "s"}.{" "}
          {runResult.sendResult.sent
            ? `Sent ${runResult.sendResult.jobCount} to your inbox. Go look.`
            : REASON_TEXT[runResult.sendResult.reason]}
        </p>
      )}
      {runResult && runResult.searchResult.errors.length > 0 && (
        <ul className="text-xs text-danger">
          {runResult.searchResult.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <ThresholdPicker
        value={threshold}
        onChange={handleThresholdChange}
        disabled={thresholdPending}
        footer={runFooter}
        trailing={
          <button
            type="button"
            onClick={handleRun}
            disabled={runBusy}
            className={`${buttonPrimary} relative h-full min-h-[2.5rem] shrink-0`}
          >
            {/* Size to the longer label so swapping in "Hunting…" doesn't resize. */}
            <span className="invisible" aria-hidden="true">
              Hunting…
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              {runBusy ? "Hunting…" : "Run now"}
            </span>
          </button>
        }
      />

      {thresholdError && <p className="text-xs text-danger">{thresholdError}</p>}
    </div>
  );
}
