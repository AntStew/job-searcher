/** Caps shared by Settings, onboarding, and server-side validation. */
export const SETTINGS_LIMITS = {
  resumeTextChars: 20_000,
  aboutYouWords: 200,
  /** Hard character backstop so a packed aboutYou string can't blow the prompt. */
  aboutYouChars: 2_000,
  listFieldChars: 2_000,
} as const;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Keep the first `maxWords` words; drops everything after. */
export function clampWords(text: string, maxWords: number): string {
  if (countWords(text) <= maxWords) return text;
  const match = text.match(new RegExp(`^(?:\\s*\\S+){${maxWords}}`));
  return match?.[0] ?? text;
}
