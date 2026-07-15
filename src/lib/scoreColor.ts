type Rgb = readonly [number, number, number];

const RED = [220, 38, 38] as const;
const YELLOW = [217, 119, 6] as const; // amber — clearer than pure yellow on white UI
const GREEN = [22, 163, 74] as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(lerp(a[0], b[0], clamped));
  const g = Math.round(lerp(a[1], b[1], clamped));
  const bl = Math.round(lerp(a[2], b[2], clamped));
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Solid fill for a 0–100 match score: red → amber → green.
 * Squared easing keeps the mid band warmer longer so typical
 * matches (60–85) aren't all the same green.
 */
export function scoreColor(score: number): string {
  const t = Math.max(0, Math.min(100, score)) / 100;
  // Ease in: 50 → ~amber, 70 → orange-amber, 85 → yellow-green, 100 → green
  const eased = t * t;
  if (eased < 0.5) return mixRgb(RED, YELLOW, eased * 2);
  return mixRgb(YELLOW, GREEN, (eased - 0.5) * 2);
}
