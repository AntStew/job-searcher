<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Job Search Assistant

Personal job-search app for ~5-10 family/friends. Each user stores a resume + preferences; a Claude agent (Sonnet, `web_search` tool) finds and scores real job postings in one call, and users get email digests on their own schedule (daily/weekly/monthly at a chosen hour/timezone).

## Stack

Next.js (App Router, TypeScript) + Tailwind v4 · Supabase (Postgres + magic-link auth) · Drizzle ORM · Resend (email) · Anthropic API (Sonnet for search+scoring, Haiku for resume extraction / role suggestions) · Supabase Edge Function (Deno) for the scheduled pipeline, triggered hourly by GitHub Actions.

## Commands

- `npm run dev` / `npm run build` — dev server / production build
- `npx tsc --noEmit` — typecheck (run this + build after every change; that's the project convention)
- `npm run db:generate` then `npm run db:migrate` — schema change flow (edits to `src/db/schema.ts` → migration → applied to live Supabase DB via `DATABASE_URL` in `.env`)
- `npx supabase functions deploy run-scheduled-pipeline --no-verify-jwt` — deploy the edge function (required after ANY change under `supabase/functions/`)

## CRITICAL: dual pipeline implementations

The scheduled pipeline exists **twice** and must be kept in sync manually:

- `src/lib/…` (Node, used by the Vercel app's "Run Now" button at `/api/pipeline/run-now`)
- `supabase/functions/_shared/…` (Deno mirror, used by the scheduled edge function)

Mirrored pairs: `buildSearchPrompt`, `searchAndMatchForUser`, `sendDigest` (edge uses plain-HTML `digestEmailHtml.ts` instead of React Email), `isDueToday`, `timezone`, `runStatus`, `upsertJobs`, `types`, `schema`, `unsubscribeToken`. Differences are only: `npm:` import specifiers, `.ts` extensions, `Deno.env.get()` instead of `process.env`. **If you change one side, change the other, then redeploy the edge function.** The root `tsconfig.json` excludes `supabase/functions` (Deno code won't pass the Node typecheck).

## Architecture map

- `src/db/schema.ts` — all tables. `jobs` dedups on `(source, source_job_id)` (URL for `web_search`); `job_matches` is per-user scores, unique `(user_id, job_id)`, `emailed_at` = "don't email twice"
- `src/lib/pipeline/searchAndMatchForUser.ts` — ONE Sonnet call does search + scoring together (`web_search` tool + custom `submit_job_matches` tool, `tool_choice: auto` so it can search first). Feeds known jobs into the prompt as an exclusion list
- `src/lib/pipeline/isDueToday.ts` — timezone-aware exact hour/day matching + min-gap guard against double sends
- `src/lib/email/sendDigest.ts` — threshold + time-window (24h/7d/30d by frequency) filtering, Resend send, marks `emailed_at`
- `src/app/dashboard/settings/` — the single shared onboarding/edit form (non-technical users; keep copy jargon-free)
- `src/lib/ui.ts` — shared button/input/card classes; use these, don't hand-roll Tailwind per component
- `supabase/auth-trigger.sql` — DB trigger that creates users/profiles/preferences/settings rows on signup (already installed in prod)

## Env vars live in FOUR places

1. `.env` (local dev, gitignored) — see `.env.example`
2. Vercel project env (when deployed)
3. Supabase edge function secrets (`npx supabase secrets set …`) — its own copies of DATABASE_URL, ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM, UNSUBSCRIBE_SECRET, APP_BASE_URL, plus EDGE_FUNCTION_SECRET
4. GitHub Actions repo secrets — SUPABASE_FUNCTION_URL, EDGE_FUNCTION_SECRET (used by `.github/workflows/hourly-pipeline.yml`)

## Gotchas

- Resend is on the shared test domain (`onboarding@resend.dev`) — only delivers to the account owner's email until a real domain is verified
- Supabase Auth sends magic-link emails through Resend SMTP (configured in the Supabase dashboard, not in code)
- The DB client caches on `globalThis` in dev (`src/db/index.ts`) — hot reload used to exhaust Supabase's connection limit
- `emailFrequency: "paused"` is the unsubscribe state; the digest email's unsubscribe link sets it
- Audience is non-technical: UI copy and the agent's `reasoning` output must stay plain-language
