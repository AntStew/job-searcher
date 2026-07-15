"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { closestThreshold, ThresholdPicker } from "@/components/ThresholdPicker";
import { buttonPrimary } from "@/lib/ui";
import { setMatchThreshold } from "./actions";

const POLL_MS = 2500;
const POLL_TIMEOUT_MS = 8 * 60 * 1000;

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
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const pollStartedAt = useRef<number | null>(null);
  const syncedServerRun = useRef(false);

  const runBusy = running || serverRunning;
  const showingStatus = runBusy || !!statusLine;

  useEffect(() => {
    if (!running) return;

    let cancelled = false;
    pollStartedAt.current = Date.now();

    async function poll() {
      while (!cancelled) {
        if (Date.now() - (pollStartedAt.current ?? 0) > POLL_TIMEOUT_MS) {
          setRunning(false);
          setStatusIsError(true);
          setStatusLine(
            "Still hunting after several minutes — refresh later. Don’t spam Run now.",
          );
          router.refresh();
          return;
        }

        try {
          const res = await fetch("/api/pipeline/run-status");
          const data = (await res.json()) as {
            running?: boolean;
            lastRunError?: string | null;
          };
          if (!res.ok) throw new Error("Status check failed");

          if (!data.running) {
            setRunning(false);
            if (data.lastRunError) {
              setStatusIsError(true);
              setStatusLine(data.lastRunError);
            } else {
              setStatusIsError(false);
              setStatusLine("Hunt finished — check Recent matches below.");
            }
            router.refresh();
            return;
          }
        } catch {
          // Keep polling through brief blips.
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [running, router]);

  // Page loaded mid-hunt — adopt server busy state once and poll.
  useEffect(() => {
    if (serverRunning && !syncedServerRun.current) {
      syncedServerRun.current = true;
      setRunning(true);
      setStatusIsError(false);
      setStatusLine("Search already in progress — hanging tight…");
    }
  }, [serverRunning]);

  function handleThresholdChange(value: number) {
    const previous = threshold;
    setThreshold(value);
    setThresholdError(null);
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
    setStatusIsError(false);
    setStatusLine("Kicking off the hunt…");

    try {
      const res = await fetch("/api/pipeline/run-now", { method: "POST" });
      const data = (await res.json()) as { error?: string; started?: boolean };

      if (!res.ok) {
        setRunning(false);
        setStatusIsError(true);
        setStatusLine(data.error ?? "Run failed.");
        router.refresh();
        return;
      }

      setStatusLine("Hunting… often 1–3 minutes. Leave this tab open.");
    } catch {
      setRunning(false);
      setStatusIsError(true);
      setStatusLine("Something went wrong starting the search.");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ThresholdPicker
        value={threshold}
        onChange={handleThresholdChange}
        disabled={thresholdPending || runBusy}
        showDescription={!showingStatus}
        footer={
          showingStatus ? (
            <p className={`text-sm ${statusIsError ? "text-danger" : "text-muted"}`}>
              {statusLine ?? "Hunting… hang tight."}
            </p>
          ) : undefined
        }
        trailing={
          <button
            type="button"
            onClick={handleRun}
            disabled={runBusy}
            className={`${buttonPrimary} relative h-full min-h-[2.5rem] shrink-0`}
          >
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
