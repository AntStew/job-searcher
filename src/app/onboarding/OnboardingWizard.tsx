"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeOnboarding } from "./actions";
import { buttonPrimary, buttonSecondary, hint as hintClass, input, label as labelClass, select, textarea } from "@/lib/ui";
import { THRESHOLD_PRESETS } from "@/lib/matchThreshold";
import { COMMON_TIMEZONES, WEEKDAY_OPTIONS } from "@/lib/timezone";

const STEPS = ["Resume", "Roles", "About you", "Emails"] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }),
}));

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function guessTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (COMMON_TIMEZONES as readonly string[]).includes(tz) ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: resume
  const [resumeText, setResumeText] = useState("");
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Step 2: roles & location
  const [desiredRoles, setDesiredRoles] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [locations, setLocations] = useState("");
  const [remotePreference, setRemotePreference] = useState("no_preference");

  // Step 3: about
  const [salaryMin, setSalaryMin] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [watchTargets, setWatchTargets] = useState("");

  // Step 4: emails
  const [threshold, setThreshold] = useState(60);
  const [emailFrequency, setEmailFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleHour, setScheduleHour] = useState(8);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [timezone] = useState(guessTimezone);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setExtractError(null);
    setUploadPhase("uploading");
    setUploadProgress(0);

    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resume/extract");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.upload.onload = () => setUploadPhase("processing");
    xhr.onload = () => {
      setUploadPhase(null);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) {
          setExtractError(data.error ?? "Could not read that file.");
          return;
        }
        setResumeText(data.text);
      } catch {
        setExtractError("Something went wrong reading that file.");
      }
    };
    xhr.onerror = () => {
      setUploadPhase(null);
      setExtractError("Something went wrong reading that file.");
    };
    xhr.send(body);
  }

  async function handleSuggestRoles() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/preferences/suggest-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      if (res.ok) setDesiredRoles((data.roles as string[]).join(", "));
    } catch {
      // non-fatal — user can type roles manually
    } finally {
      setSuggesting(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("resumeText", resumeText);
    formData.set("desiredRoles", desiredRoles);
    formData.set("locations", locations);
    formData.set("remotePreference", remotePreference);
    formData.set("salaryMin", salaryMin);
    formData.set("yearsOfExperience", yearsOfExperience);
    formData.set("industries", "");
    formData.set("aboutYou", aboutYou);
    formData.set("watchTargets", watchTargets);
    formData.set("matchThreshold", String(threshold));
    formData.set("emailFrequency", emailFrequency);
    formData.set("scheduleHour", String(scheduleHour));
    formData.set("scheduleDayOfWeek", String(scheduleDayOfWeek));
    formData.set("scheduleDayOfMonth", String(scheduleDayOfMonth));
    formData.set("timezone", timezone);

    const result = await completeOnboarding(formData);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push("/dashboard");
  }

  const canContinue =
    step === 0 ? resumeText.trim().length > 0 : true;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-xl font-bold">
          <span className="text-loot">Set up your job hunt</span>
        </h1>
        <p className="text-sm text-muted">
          A few quick steps, then the agent starts hunting jobs that fit you. Just do a few it
          wont kill you.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((name, i) => (
          <div key={name} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-accent" : "bg-border"
              }`}
            />
            <span className={`text-center text-[11px] ${i <= step ? "text-ink font-medium" : "text-muted"}`}>
              {name}
            </span>
          </div>
        ))}
      </div>

      <div
        key={step}
        className="animate-[stepIn_.35s_ease] rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(23,26,28,0.04)]"
      >
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-base font-semibold">Add your resume</h2>
              <p className={hintClass}>
                This is what the assistant compares against every job it finds. Upload a file and
                we&apos;ll read it for you, or paste the text.
              </p>
            </div>

            <label className={`${buttonSecondary} w-fit cursor-pointer`}>
              {uploadPhase ? "Reading file…" : "Upload PDF / DOCX"}
              <input
                type="file"
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                disabled={uploadPhase !== null}
                className="hidden"
              />
            </label>

            {uploadPhase === "uploading" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {uploadPhase === "processing" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
              </div>
            )}
            {extractError && <p className="text-xs text-danger">{extractError}</p>}

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={9}
              placeholder="…or paste your resume text here"
              className={`${textarea} font-mono`}
            />
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">What are you looking for?</h2>
              <p className={hintClass}>Rough answers are fine — you can change everything later.</p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Roles you&apos;d like</label>
                <button
                  type="button"
                  onClick={handleSuggestRoles}
                  disabled={suggesting}
                  className="text-xs font-medium text-accent underline decoration-accent/40 underline-offset-2 disabled:opacity-50"
                >
                  {suggesting ? "Thinking…" : "✨ Suggest from my resume"}
                </button>
              </div>
              <input
                type="text"
                value={desiredRoles}
                onChange={(e) => setDesiredRoles(e.target.value)}
                placeholder="e.g. Software Engineer, Data Analyst"
                className={input}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Where?</label>
              <input
                type="text"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="e.g. Chicago IL, Remote"
                className={input}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Remote preference</label>
              <select
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value)}
                className={select}
              >
                <option value="no_preference">No preference</option>
                <option value="remote">Remote only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">A little about you</h2>
              <p className={hintClass}>
                All optional — but the more context the assistant has, the better its picks.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Minimum salary</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="e.g. 60000"
                  className={input}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Years of experience</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="e.g. 3"
                  className={input}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Tell the assistant about yourself</label>
              <textarea
                value={aboutYou}
                onChange={(e) => setAboutYou(e.target.value)}
                rows={4}
                placeholder="Your goals, what kind of work excites you, anything a job must have or must not have…"
                className={textarea}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Companies to watch (optional)</label>
              <input
                type="text"
                value={watchTargets}
                onChange={(e) => setWatchTargets(e.target.value)}
                placeholder="e.g. Nintendo, Costco"
                className={input}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-base font-semibold">How should we email you?</h2>
              <p className={hintClass}>
                You&apos;ll get a digest of your best new matches on this schedule.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>How picky should we be?</label>
              <div className="grid grid-cols-3 gap-2">
                {THRESHOLD_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setThreshold(preset.value)}
                    aria-pressed={threshold === preset.value}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      threshold === preset.value
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-muted hover:bg-bg"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className={hintClass}>
                {THRESHOLD_PRESETS.find((preset) => preset.value === threshold)?.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Frequency</label>
                <select
                  value={emailFrequency}
                  onChange={(e) => setEmailFrequency(e.target.value as typeof emailFrequency)}
                  className={select}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Time of day</label>
                <select
                  value={scheduleHour}
                  onChange={(e) => setScheduleHour(Number(e.target.value))}
                  className={select}
                >
                  {HOUR_OPTIONS.map((hour) => (
                    <option key={hour.value} value={hour.value}>
                      {hour.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {emailFrequency === "weekly" && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Day of week</label>
                <select
                  value={scheduleDayOfWeek}
                  onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}
                  className={select}
                >
                  {WEEKDAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {emailFrequency === "monthly" && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Day of month</label>
                <select
                  value={scheduleDayOfMonth}
                  onChange={(e) => setScheduleDayOfMonth(Number(e.target.value))}
                  className={select}
                >
                  {DAY_OF_MONTH_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className={hintClass}>
              Times are in your timezone ({timezone.replace(/_/g, " ")}). Change any of this later in
              Settings. Tip: your first digest may land in spam — check there and mark it &quot;not
              spam&quot; so future ones land in your inbox.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-center text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || saving}
          className={`${buttonSecondary} ${step === 0 ? "invisible" : ""}`}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className={buttonPrimary}
          >
            Continue
          </button>
        ) : (
          <button type="button" onClick={handleFinish} disabled={saving} className={buttonPrimary}>
            {saving ? "Setting things up…" : "Finish setup"}
          </button>
        )}
      </div>
    </main>
  );
}
