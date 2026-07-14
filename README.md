# Unemployment Final Boss 💀

gEt a Job bRokE BuM. This app makes sure you can't pretend you "couldn't find anything."

A Claude agent reads your resume, scours the internet for real job postings, scores how well each one fits you, and emails you a digest on your schedule — with commentary from your funniest, least supportive friend. LinkedIn a scam, use this.

## What it does

- **You** paste a resume, set preferences (roles, location, salary, dealbreakers), and pick an email schedule.
- **The agent** (Claude Sonnet + web search) hunts postings across LinkedIn, Indeed, company career pages, etc., scores each 0–100 against *your* resume, and explains the fit like a blunt friend texting you — no "dynamic fast-paced environment" nonsense.
- **Your inbox** gets the digest daily/weekly/monthly. rent dueeeee.
- **The tracker** keeps score of what you actually applied to, because "I'll do it tomorrow" is not a status.

Invite-only. Ask Anthony if u want in.

## Stack

Next.js (App Router) + Tailwind · Supabase (Postgres + magic-link auth) · Drizzle · Resend · Anthropic API · Supabase Edge Function on an hourly GitHub Actions cron.

## Commands

```bash
npm run dev          # local dev
npm run test         # unit tests (vitest)
npx tsc --noEmit     # typecheck
npm run build        # production build
npm run db:generate  # schema change → migration file
npm run db:migrate   # apply migration to live DB
npx supabase functions deploy run-scheduled-pipeline --no-verify-jwt   # after ANY supabase/functions change
```

## The one thing you must not forget

The pipeline lives **twice**: `src/lib/…` (Node, "Run now" button) and `supabase/functions/_shared/…` (Deno, scheduled runs). Change one, change the other, redeploy the edge function. See `AGENTS.md` for the full map. Don't embarrass yourself in front of the huzzzz.
