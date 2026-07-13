"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SaveSettingsResult } from "./actions";

const THRESHOLD_PRESETS = [
  { label: "Broad", value: 40, hint: "Many jobs you'd have a shot at" },
  { label: "Balanced", value: 60, hint: "Solid overall fit" },
  { label: "Strict", value: 80, hint: "Only excellent matches" },
];

export type SettingsFormInitialValues = {
  resumeText: string;
  desiredRoles: string[];
  locations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "no_preference";
  salaryMin: number | null;
  industries: string[];
  mustHaves: string;
  dealbreakers: string;
  watchTargets: string[];
  matchThreshold: number;
  emailFrequency: "daily" | "every_3_days" | "weekly" | "paused";
};

const initialState: SaveSettingsResult | null = null;

export function SettingsForm({ initial }: { initial: SettingsFormInitialValues }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const [threshold, setThreshold] = useState(initial.matchThreshold);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="resumeText" className="text-sm font-medium">
          Resume
        </label>
        <p className="text-xs text-gray-500">
          Paste your resume as plain text. This is what the AI compares against every job it finds.
        </p>
        <textarea
          id="resumeText"
          name="resumeText"
          defaultValue={initial.resumeText}
          rows={12}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Job preferences</h2>

        <Field
          name="desiredRoles"
          label="Desired roles"
          hint="Comma-separated, e.g. Software Engineer, Product Manager"
          defaultValue={initial.desiredRoles.join(", ")}
        />
        <Field
          name="locations"
          label="Locations"
          hint="Comma-separated, e.g. Austin TX, Remote"
          defaultValue={initial.locations.join(", ")}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="remotePreference" className="text-sm font-medium">
            Remote preference
          </label>
          <select
            id="remotePreference"
            name="remotePreference"
            defaultValue={initial.remotePreference}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="no_preference">No preference</option>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="salaryMin" className="text-sm font-medium">
            Minimum salary
          </label>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            inputMode="numeric"
            defaultValue={initial.salaryMin ?? ""}
            placeholder="e.g. 90000"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <Field
          name="industries"
          label="Industries"
          hint="Comma-separated, optional"
          defaultValue={initial.industries.join(", ")}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="mustHaves" className="text-sm font-medium">
            Must-haves
          </label>
          <textarea
            id="mustHaves"
            name="mustHaves"
            defaultValue={initial.mustHaves}
            rows={3}
            placeholder="e.g. must offer health insurance, must be fully remote"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dealbreakers" className="text-sm font-medium">
            Dealbreakers
          </label>
          <textarea
            id="dealbreakers"
            name="dealbreakers"
            defaultValue={initial.dealbreakers}
            rows={3}
            placeholder="e.g. no cold-calling roles, no unpaid overtime culture"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <Field
          name="watchTargets"
          label="Companies to watch (optional)"
          hint="Comma-separated company names — we'll specifically search for openings there"
          defaultValue={initial.watchTargets.join(", ")}
        />
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="matchThreshold" className="text-sm font-medium">
          Match threshold: {threshold}
        </label>
        <p className="text-xs text-gray-500">
          Lower = more jobs, including long shots. Higher = only your best-fit matches.
        </p>
        <input
          id="matchThreshold"
          name="matchThreshold"
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex gap-2 text-xs">
          {THRESHOLD_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.label}
              onClick={() => setThreshold(preset.value)}
              className="rounded-full border border-gray-300 px-2 py-1 hover:bg-gray-50"
              title={preset.hint}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <label htmlFor="emailFrequency" className="text-sm font-medium">
          Email frequency
        </label>
        <select
          id="emailFrequency"
          name="emailFrequency"
          defaultValue={initial.emailFrequency}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="daily">Daily</option>
          <option value="every_3_days">Every 3 days</option>
          <option value="weekly">Weekly</option>
          <option value="paused">Paused</option>
        </select>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.ok === true && <span className="text-sm text-green-700">Saved.</span>}
        {state?.ok === false && <span className="text-sm text-red-600">{state.error}</span>}
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
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
