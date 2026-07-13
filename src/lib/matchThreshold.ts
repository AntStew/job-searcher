export const THRESHOLD_PRESETS = [
  {
    label: "Broad",
    value: 40,
    description: "Best if you want more options — includes jobs that are a reasonable stretch, not just sure things.",
  },
  {
    label: "Balanced",
    value: 60,
    description: "Best for most people — solid, realistic fits without the long shots or the nitpicking.",
  },
  {
    label: "Strict",
    value: 80,
    description: "Best if you only want to hear about standout matches and don't want your inbox crowded.",
  },
] as const;

export function thresholdLabel(value: number): string {
  const closest = THRESHOLD_PRESETS.reduce((closest, preset) =>
    Math.abs(preset.value - value) < Math.abs(closest.value - value) ? preset : closest,
  );
  return closest.label;
}
