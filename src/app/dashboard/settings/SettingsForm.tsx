"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SaveSettingsResult } from "./actions";
import { buttonPrimary, buttonSecondary, card, hint as hintClass, input, label as labelClass, linkButton, select, textarea } from "@/lib/ui";
import { THRESHOLD_PRESETS } from "@/lib/matchThreshold";
import { COMMON_TIMEZONES, WEEKDAY_OPTIONS } from "@/lib/timezone";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }),
}));

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export type SettingsFormInitialValues = {
  resumeText: string;
  desiredRoles: string[];
  locations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "no_preference";
  salaryMin: number | null;
  yearsOfExperience: number | null;
  industries: string[];
  aboutYou: string;
  watchTargets: string[];
  matchThreshold: number;
  emailFrequency: "daily" | "weekly" | "monthly" | "paused";
  scheduleHour: number;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number;
  timezone: string;
};

const initialState: SaveSettingsResult | null = null;

export function SettingsForm({ initial }: { initial: SettingsFormInitialValues }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const [threshold, setThreshold] = useState(() =>
    THRESHOLD_PRESETS.reduce((closest, preset) =>
      Math.abs(preset.value - initial.matchThreshold) < Math.abs(closest.value - initial.matchThreshold)
        ? preset
        : closest,
    ).value,
  );
  const [resumeText, setResumeText] = useState(initial.resumeText);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [desiredRoles, setDesiredRoles] = useState(initial.desiredRoles.join(", "));
  const [suggestingRoles, setSuggestingRoles] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [emailFrequency, setEmailFrequency] = useState(initial.emailFrequency);
  const [scheduleHour, setScheduleHour] = useState(initial.scheduleHour);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(initial.scheduleDayOfWeek);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(initial.scheduleDayOfMonth);
  const [timezone, setTimezone] = useState(initial.timezone);

  async function handleSuggestRoles() {
    setSuggestError(null);
    setSuggestingRoles(true);
    try {
      const res = await fetch("/api/preferences/suggest-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestError(data.error ?? "Could not suggest roles.");
        return;
      }
      setDesiredRoles((data.roles as string[]).join(", "));
    } catch {
      setSuggestError("Something went wrong suggesting roles.");
    } finally {
      setSuggestingRoles(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;

    setExtractError(null);
    setUploadPhase("uploading");
    setUploadProgress(0);

    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resume/extract");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className={`${card} flex flex-col gap-3`}>
        <div>
          <h2 className="font-display text-base font-semibold">Resume</h2>
          <p className={hintClass}>
            Upload your resume, or paste it as plain text. This is what the AI compares against every job it finds.
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

        <label htmlFor="resumeText" className={hintClass}>
          {resumeText ? "Parsed result — edit as needed before saving" : "Or paste resume text here"}
        </label>
        <textarea
          id="resumeText"
          name="resumeText"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={12}
          className={`${textarea} font-mono`}
        />
      </section>

      <section className={`${card} flex flex-col gap-2`}>
        <div>
          <h2 className="font-display text-base font-semibold">About you</h2>
          <p className={hintClass}>
            Tell the search agent about your experience, goals, and what kind of work excites you — including
            anything a job absolutely must have or must not have. The more context you give it, the better it
            can judge whether a job is actually a good fit.
          </p>
        </div>
        <textarea
          id="aboutYou"
          name="aboutYou"
          defaultValue={initial.aboutYou}
          rows={4}
          placeholder="e.g. I've spent the last 2 years doing customer support and want to move into a more technical role. I need fully remote work and won't consider anything with cold-calling."
          className={textarea}
        />
      </section>

      <section className={`${card} flex flex-col gap-4`}>
        <h2 className="font-display text-base font-semibold">Job preferences</h2>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="desiredRoles" className={labelClass}>
              Desired roles
            </label>
            <button
              type="button"
              onClick={handleSuggestRoles}
              disabled={suggestingRoles || !resumeText}
              className={linkButton}
              title={!resumeText ? "Add your resume above first" : undefined}
            >
              {suggestingRoles ? "Thinking…" : "Suggest roles from resume"}
            </button>
          </div>
          <p className={hintClass}>Comma-separated, e.g. Software Engineer, Product Manager</p>
          {suggestError && <p className="text-xs text-danger">{suggestError}</p>}
          <input
            id="desiredRoles"
            name="desiredRoles"
            type="text"
            value={desiredRoles}
            onChange={(e) => setDesiredRoles(e.target.value)}
            className={input}
          />
        </div>

        <Field
          name="locations"
          label="Locations"
          hint="Comma-separated, e.g. Austin TX, Remote"
          defaultValue={initial.locations.join(", ")}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="remotePreference" className={labelClass}>
            Remote preference
          </label>
          <select
            id="remotePreference"
            name="remotePreference"
            defaultValue={initial.remotePreference}
            className={select}
          >
            <option value="no_preference">No preference</option>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="salaryMin" className={labelClass}>
            Minimum salary
          </label>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            inputMode="numeric"
            defaultValue={initial.salaryMin ?? ""}
            placeholder="e.g. 90000"
            className={input}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="yearsOfExperience" className={labelClass}>
            Years of experience
          </label>
          <p className={hintClass}>So the agent doesn&apos;t suggest roles way above or below your level.</p>
          <input
            id="yearsOfExperience"
            name="yearsOfExperience"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={initial.yearsOfExperience ?? ""}
            placeholder="e.g. 3"
            className={input}
          />
        </div>

        <Field
          name="industries"
          label="Industries"
          hint="Comma-separated, optional"
          defaultValue={initial.industries.join(", ")}
        />

        <Field
          name="watchTargets"
          label="Companies to watch (optional)"
          hint="Comma-separated company names — the search agent will specifically check these as part of its search"
          defaultValue={initial.watchTargets.join(", ")}
        />
      </section>

      <section className={`${card} flex flex-col gap-3`}>
        <div>
          <h2 className="font-display text-base font-semibold">Match threshold</h2>
          <p className={hintClass}>How picky should we be about what lands in your inbox?</p>
        </div>

        <input type="hidden" name="matchThreshold" value={threshold} />

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

        <p className="text-sm text-muted">
          {THRESHOLD_PRESETS.find((preset) => preset.value === threshold)?.description}
        </p>
      </section>

      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className="font-display text-base font-semibold">Email schedule</h2>
          <p className={hintClass}>
            Daily emails cover jobs found in the last 24 hours, weekly covers the last week, and monthly
            covers the last month — each showing your best matches from that window.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="emailFrequency" className={labelClass}>
            Frequency
          </label>
          <select
            id="emailFrequency"
            name="emailFrequency"
            value={emailFrequency}
            onChange={(e) => setEmailFrequency(e.target.value as typeof emailFrequency)}
            className={select}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        {emailFrequency !== "paused" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="scheduleHour" className={labelClass}>
                  Time of day
                </label>
                <select
                  id="scheduleHour"
                  name="scheduleHour"
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

              <div className="flex flex-col gap-1">
                <label htmlFor="timezone" className={labelClass}>
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={select}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {emailFrequency === "weekly" && (
              <div className="flex flex-col gap-1">
                <label htmlFor="scheduleDayOfWeek" className={labelClass}>
                  Day of week
                </label>
                <select
                  id="scheduleDayOfWeek"
                  name="scheduleDayOfWeek"
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
                <label htmlFor="scheduleDayOfMonth" className={labelClass}>
                  Day of month
                </label>
                <select
                  id="scheduleDayOfMonth"
                  name="scheduleDayOfMonth"
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
          </>
        )}

        {/* Keep these fields in the submitted form even when hidden, so pausing doesn't wipe a saved schedule. */}
        {emailFrequency === "paused" && (
          <>
            <input type="hidden" name="scheduleHour" value={scheduleHour} />
            <input type="hidden" name="timezone" value={timezone} />
            <input type="hidden" name="scheduleDayOfWeek" value={scheduleDayOfWeek} />
            <input type="hidden" name="scheduleDayOfMonth" value={scheduleDayOfMonth} />
          </>
        )}
        {emailFrequency === "daily" && (
          <>
            <input type="hidden" name="scheduleDayOfWeek" value={scheduleDayOfWeek} />
            <input type="hidden" name="scheduleDayOfMonth" value={scheduleDayOfMonth} />
          </>
        )}
        {emailFrequency === "weekly" && (
          <input type="hidden" name="scheduleDayOfMonth" value={scheduleDayOfMonth} />
        )}
        {emailFrequency === "monthly" && (
          <input type="hidden" name="scheduleDayOfWeek" value={scheduleDayOfWeek} />
        )}
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.ok === true && <span className="text-sm text-accent">Saved.</span>}
        {state?.ok === false && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  defaultValue,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {hint && <p className={hintClass}>{hint}</p>}
      <input id={name} name={name} type="text" defaultValue={defaultValue} className={input} />
    </div>
  );
}
