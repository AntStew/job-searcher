"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonPrimary } from "@/lib/ui";

type RunResult = {
  searchResult: { found: number; upserted: number; scored: number; errors: string[] };
  sendResult:
    | { sent: true; jobCount: number }
    | { sent: false; reason: "no_matches" | "paused" | "user_not_found" };
};

const REASON_TEXT: Record<string, string> = {
  no_matches: "No jobs cleared your threshold this run.",
  paused: "Email is paused — matches were still saved.",
  user_not_found: "Something went wrong finding your account.",
};

export function RunNowButton({ serverRunning = false }: { serverRunning?: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = running || serverRunning;

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/pipeline/run-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Run failed.");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Something went wrong running the search.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleRun} disabled={busy} className={buttonPrimary}>
        {busy ? "Searching…" : "Run now"}
      </button>
      {serverRunning && !running && (
        <p className="text-xs text-muted">Already running elsewhere (e.g. the daily schedule) — hang tight.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {result && (
        <p className="text-xs text-muted">
          The agent found {result.searchResult.found} job{result.searchResult.found === 1 ? "" : "s"} worth
          scoring.{" "}
          {result.sendResult.sent
            ? `Sent a digest with ${result.sendResult.jobCount} job${result.sendResult.jobCount === 1 ? "" : "s"}.`
            : REASON_TEXT[result.sendResult.reason]}
        </p>
      )}
      {result && result.searchResult.errors.length > 0 && (
        <ul className="text-xs text-danger">
          {result.searchResult.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
