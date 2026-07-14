---
name: test-pipeline
description: How to trigger and verify a real job-search run end-to-end — via the dashboard, the edge function, or direct DB inspection — including how to bypass the send-guard for testing.
---

# Test the job-search pipeline

## Zero-cost first pass: unit tests

`npm run test` covers the pure logic (schedule matching, URL dedup normalization, prompt assembly, tokens, taunt selection) without touching the DB or the Anthropic API. Run it before any live test.

## Fastest: dashboard Run Now

With `npm run dev` running, sign in and click **Run now** on the dashboard. This runs the full search → score → email path on the Vercel/Node side (`/api/pipeline/run-now`), ignoring the schedule. The summary line under the button reports found/scored/sent counts and surfaces any errors. Manual runs are fully independent of the schedule (they set `last_manual_run_at`, never `last_run_at`) and non-admins get one per 12h; the admin account is exempt.

## Scheduled path: edge function

```
curl.exe -s -X POST "https://crfmqodlqxxpjseyyxgi.supabase.co/functions/v1/run-scheduled-pipeline" -H "Authorization: Bearer <EDGE_FUNCTION_SECRET from .env>"
```

This runs for users whose scheduled slot started within the last 3 hours (`CATCH_UP_HOURS` in `schedule.ts`) in their timezone. Two guards will make it report `usersDue: 0`:

1. **Slot mismatch** — the user's `schedule_hour`/day (in their timezone) isn't within the last 3 hours. Fix: set their schedule to the current hour in Settings, or trigger via GitHub (`Actions → Hourly job search run → Run workflow`).
2. **Slot cooldown** — a successful scheduled run happened within the last 4h (`SLOT_COOLDOWN_HOURS`, keyed on `last_run_at`; manual runs don't count). Clear it for testing:

```
node -e "require('dotenv').config();const p=require('postgres');const s=p(process.env.DATABASE_URL,{prepare:false});s\`update user_settings set last_run_at=null\`.then(r=>{console.log('cleared',r.count);process.exit(0)})"
```

## Inspecting results

Query live data directly (this pattern works around not having psql):

```
node -e "require('dotenv').config();const p=require('postgres');const s=p(process.env.DATABASE_URL,{prepare:false});s\`select j.title,j.company,m.score,m.emailed_at from job_matches m join jobs j on j.id=m.job_id order by m.scored_at desc limit 10\`.then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0)})"
```

Note: `dotenv` v17 prints an ad line on load — ignore it, it's cosmetic.

## What a healthy run looks like

- Response: `{"usersDue":1,"results":{"<uuid>":{"searchResult":{"found":N,"upserted":N,"scored":N,"errors":[]},"sendResult":{"sent":true,"jobCount":M}}}}`
- `sent:false, reason:"no_matches"` is normal when nothing new cleared the threshold within the digest's time window (24h/7d/30d by frequency)
- Digest emails land in **spam** on the Resend test domain — check there
- Runs cost real Anthropic usage (Sonnet + up to 15 web searches per user) — don't loop-test carelessly
- Failed runs write `user_settings.last_run_error` (visible on `/admin`) and do NOT update `last_run_at`, so a failed run never blocks a retry with the 24h cooldown
