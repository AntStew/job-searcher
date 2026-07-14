<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Unemployment Final Boss (job-searcher)

Personal job-search app for ~5-10 family/friends. Each user stores a resume + preferences; a Claude agent (Sonnet, `web_search` tool) finds and scores real job postings in one call, and users get email digests on their own schedule (daily/weekly/monthly at a chosen hour/timezone). The brand voice is the user's own taunts (`src/lib/taunts.ts`) — dashboard headers, email subjects, and the agent's match reasoning all use it.

## Stack

Next.js (App Router, TypeScript) + Tailwind v4 · Supabase (Postgres + magic-link auth) · Drizzle ORM · Resend (email) · Anthropic API (Sonnet for search+scoring, Haiku for resume extraction / role suggestions) · Supabase Edge Function (Deno) for the scheduled pipeline, triggered hourly by GitHub Actions · Vitest for unit tests.

## Commands

- `npm run dev` / `npm run build` — dev server / production build
- `npx tsc --noEmit` — typecheck (run this + build after every change; that's the project convention)
- `npm run test` — vitest unit tests (`src/**/*.test.ts`, co-located with the module they test). Anything importing `@/db` must `vi.mock("@/db", () => ({ db: {} }))` at the top of the test file (`src/db/index.ts` throws without `DATABASE_URL`); same for `@anthropic-ai/sdk` (throws without an API key). Coverage spans schedule matching incl. DST, timezone parts, URL dedup, unsubscribe tokens + route handlers, both digest HTML renderers, the agent's `submit_job_matches` zod contract (`matchSchema`), prompt assembly, taunt selection, settings validation, and formatting — extend the nearest suite when touching those areas
- `npm run db:generate` then `npm run db:migrate` — schema change flow (edits to `src/db/schema.ts` → migration → applied to live Supabase DB via `DATABASE_URL` in `.env`). Also mirror the change into `supabase/functions/_shared/schema.ts`
- `npx supabase functions deploy run-scheduled-pipeline --no-verify-jwt` — deploy the edge function (required after ANY change under `supabase/functions/`)

## CRITICAL: dual pipeline implementations

The scheduled pipeline exists **twice** and must be kept in sync manually:

- `src/lib/…` (Node, used by the Vercel app's "Run Now" button at `/api/pipeline/run-now`)
- `supabase/functions/_shared/…` (Deno mirror, used by the scheduled edge function)

Mirrored pairs: `buildSearchPrompt`, `searchAndMatchForUser`, `sendDigest` (edge uses plain-HTML `digestEmailHtml.ts` instead of React Email), `schedule`, `timezone`, `runStatus`, `upsertJobs`, `normalizeUrl`, `digestWindow`, `taunts`, `types`, `schema`, `unsubscribeToken`. Differences are only: `npm:` import specifiers, `.ts` extensions, `Deno.env.get()` instead of `process.env`. **If you change one side, change the other, then redeploy the edge function.** The root `tsconfig.json` excludes `supabase/functions` (Deno code won't pass the Node typecheck). Use the `deploy-pipeline` skill for the full runbook.

## Architecture map

- `src/db/schema.ts` — all tables. `jobs` dedups on `(source, source_job_id)` (normalized URL for `web_search`); `job_matches` is per-user scores, unique `(user_id, job_id)`, `emailed_at` = "don't email twice"; `user_settings.last_run_error` = most recent failed run's message (shown on `/admin`)
- `src/lib/jobSources/normalizeUrl.ts` — dedup key normalization. Strips hash + tracking params (`utm_*`, `ref`, `gclid`, …) ONLY. Never strip the whole query string: boards like Indeed identify the posting by query param (`viewjob?jk=…`), so wholesale stripping collapses distinct jobs and attaches matches to the wrong job
- `src/lib/pipeline/searchAndMatchForUser.ts` — ONE Sonnet call does search + scoring together (`web_search_20260209` server tool + custom `submit_job_matches` tool, `tool_choice: auto` so it can search first). Feeds known jobs into the prompt as an exclusion list, and liked/disliked history to steer taste
- `src/lib/pipeline/schedule.ts` — `isDueNow`: timezone-aware slot matching with a 3h CATCH_UP window (GitHub cron skips/delays hours — a late trigger still delivers) and a 4h SLOT_COOLDOWN keyed on `lastRunAt` (blocks re-fires of the same slot, incl. the DST fall-back repeat). Scheduled and manual runs are fully independent: manual runs never set `lastRunAt`, so they can never suppress the scheduled digest
- `src/lib/pipeline/runStatus.ts` — `markRunFinished(userId, { scheduled, error })`. Success sets `lastRunAt` (scheduled) or `lastManualRunAt` (manual, drives the 12h manual cooldown — admins exempt). Failures set neither (no cooldown burned) and record `lastRunError`
- `src/lib/email/sendDigest.ts` — threshold + dealbreaker + not-yet-emailed + time-window filtering, Resend send, marks `emailed_at`. Window/cap constants live in `digestWindow.ts` and are shared with the dashboard's "Ready to send" stat so the two never disagree
- `src/app/dashboard/` — matches list (top 20), `tracker/` (all matches with an application status, grouped), `settings/` (single shared onboarding/edit form; non-technical users, keep copy jargon-free)
- `src/lib/taunts.ts` — the user's taunt lines + `pickTaunt(stats)` which prefers data-driven roasts (matches found vs applications sent, etc.). Fed to the search agent as voice examples in `buildSearchPrompt`
- `src/lib/supabase/getCurrentUser.ts` — React-`cache()`d `auth.getUser()`; use this in server components, never call `createClient().auth.getUser()` directly in pages/layouts (double network round-trip)
- `src/lib/ui.ts` — shared button/input/card classes; use these, don't hand-roll Tailwind per component
- `src/lib/format.ts` — shared `formatSalary`/`formatDate`/`formatDateTime` for pages; don't re-declare these per page. (Exception: the two `sendDigest` mirrors keep a private `formatSalary` so the pair stays byte-comparable)
- `supabase/auth-trigger.sql` — DB trigger that creates users/profiles/preferences/settings rows on signup (already installed in prod)

## UI conventions

- Internal navigation uses `next/link` `<Link>`, never `<a href>` — plain anchors cause full-document reloads (this was the "pages take a second to switch" bug)
- Every route group has a `loading.tsx` skeleton (pulse divs on `bg-border/60`); add one for any new page so navigation stays instant
- External links (job postings) stay `<a target="_blank">`

## Env vars live in FOUR places

1. `.env` (local dev, gitignored) — see `.env.example`
2. Vercel project env (when deployed)
3. Supabase edge function secrets (`npx supabase secrets set …`) — its own copies of DATABASE_URL, ANTHROPIC_API_KEY, RESEND_API_KEY, EMAIL_FROM, UNSUBSCRIBE_SECRET, APP_BASE_URL, plus EDGE_FUNCTION_SECRET
4. GitHub Actions repo secrets — SUPABASE_FUNCTION_URL, EDGE_FUNCTION_SECRET (used by `.github/workflows/hourly-pipeline.yml`)

## Gotchas

- `/api/unsubscribe` MUST stay in `PUBLIC_PATHS` in `src/lib/supabase/middleware.ts` — recipients click it from email with no session; it auths via its own HMAC token. GET renders a confirm page (mail scanners follow GETs), POST does the actual pause
- `/api/pipeline/run-now` guards: admin-locked 403, already-running 409 (`isRunInProgress`), 12h manual cooldown 429 for non-admins (keyed off `lastManualRunAt`, which failed runs don't set)
- The edge function runs due users concurrently (`Promise.allSettled`) — keep it that way; sequential runs can blow the edge wall-clock limit when several users share an hour
- The GitHub cron is `13,43 * * * *` on purpose — top-of-hour slots get skipped/delayed by GitHub. Don't "simplify" it back to `0 * * * *`; `isDueNow`'s catch-up window and slot cooldown are designed around twice-hourly off-peak fires
- Resend is on the shared test domain (`onboarding@resend.dev`) — only delivers to the account owner's email until a real domain is verified
- Supabase Auth sends magic-link emails through Resend SMTP (configured in the Supabase dashboard, not in code)
- The DB client caches on `globalThis` in dev (`src/db/index.ts`) — hot reload used to exhaust Supabase's connection limit
- `emailFrequency: "paused"` is the unsubscribe state; the digest email's unsubscribe link sets it
- Audience is non-technical: UI copy stays plain-language. The agent's `reasoning` output is deliberately in the taunt voice (casual, blunt, funny) — that's a feature, don't "professionalize" it
- Anthropic model IDs in use: `claude-sonnet-5` (search+scoring), `claude-haiku-4-5` (resume extraction, role suggestions). Pricing constants in `anthropicPricing.ts` are the $3/$15 Sonnet sticker price
- Vendored skills: `.agents/skills/` is the source of truth; the `.claude/skills/supabase*` entries are local symlinks and gitignored — don't re-commit copies of them
- There is no browser-side Supabase client — all auth goes through `src/lib/supabase/server.ts` (server components/actions) and `middleware.ts`. Don't add a `client.ts` unless something genuinely needs client-side auth
