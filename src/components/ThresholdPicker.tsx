"use client";

import { THRESHOLD_PRESETS } from "@/lib/matchThreshold";

export function closestThreshold(value: number): number {
  return THRESHOLD_PRESETS.reduce((closest, preset) =>
    Math.abs(preset.value - value) < Math.abs(closest.value - value) ? preset : closest,
  ).value;
}

export function ThresholdPicker({
  value,
  onChange,
  disabled = false,
  descriptionClassName = "text-sm text-muted",
  showDescription = true,
  /** When set, replaces the preset description under the buttons. */
  footer,
  trailing,
  buttonClassName = "",
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  descriptionClassName?: string;
  showDescription?: boolean;
  footer?: React.ReactNode;
  trailing?: React.ReactNode;
  buttonClassName?: string;
}) {
  const threshold = closestThreshold(value);
  const description = THRESHOLD_PRESETS.find((preset) => preset.value === threshold)?.description;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          {THRESHOLD_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.label}
              onClick={() => onChange(preset.value)}
              disabled={disabled}
              aria-pressed={threshold === preset.value}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                threshold === preset.value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-border text-muted hover:bg-panel"
              } ${buttonClassName}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {trailing}
      </div>
      {footer !== undefined
        ? footer
        : showDescription && description && <p className={descriptionClassName}>{description}</p>}
    </div>
  );
}
