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

The batch call answers in ~2s with `{"usersDue":N,"results":{"<uuid>":"dispatched"}}` (202) — each due user is dispatched to its own self-request, which runs the search INLINE on its own worker (~1–2.5 min) and writes its outcome to `user_settings`. To run one user synchronously and see the full result, POST `{"userId":"<uuid>","manual":true}` with `--max-time 290`; the response is the completed run: `{"userId":…,"searchResult":{found,upserted,scored,errors,cameUpEmpty},"sendResult":…,"errorSummary":…}`. NEVER move pipeline work to `EdgeRuntime.waitUntil` background tasks — they get CPU-starved and die silently (measured: ~60s inline vs timeout at 120s in background).

Three guards will make the batch report `usersDue: 0` / skip a user:

1. **Slot mismatch** — the user's `schedule_hour`/day (in their timezone) isn't within the last 3 hours (`CATCH_UP_HOURS` in `schedule.ts`). Fix: set their schedule to the current hour in Settings, or trigger via GitHub (`Actions → Hourly job search run → Run workflow`).
2. **Run-in-progress guard** — `run_started_at` younger than 10 min (`RUN_GUARD_MINUTES` in the edge `index.ts`) skips the user; older locks are auto-cleared by the batch watchdog with a "was interrupted" error.
3. **Slot cooldown** — a successful scheduled run happened within the last 4h (`SLOT_COOLDOWN_HOURS`, keyed on `last_run_at`; manual runs don't count). Clear it for testing:

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

- Single-user response: `{"userId":…,"searchResult":{"found":N,"upserted":N,"scored":N,"errors":[],"cameUpEmpty":false},"sendResult":{"sent":true,"jobCount":M},"errorSummary":null}`
- `sent:false, reason:"no_matches"` is normal when nothing new cleared the threshold within the digest's time window (24h/7d/30d by frequency)
- `cameUpEmpty:true` (timeout/cutoff/zero results) is a benign outcome: a scheduled run counts as delivered and sends the "no new matches today" email; a manual run records the reason for the dashboard and sends nothing
- Runs cost real Anthropic usage (Sonnet + up to 3 web searches per user, ~110s typical) — don't loop-test carelessly
- Failed runs write `user_settings.last_run_error` (visible on `/admin`) and do NOT update `last_run_at`, so a failed run never blocks a retry with the 24h cooldown
