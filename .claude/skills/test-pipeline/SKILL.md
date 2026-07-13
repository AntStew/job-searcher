---
name: test-pipeline
description: How to trigger and verify a real job-search run end-to-end — via the dashboard, the edge function, or direct DB inspection — including how to bypass the send-guard for testing.
---

# Test the job-search pipeline

## Fastest: dashboard Run Now

With `npm run dev` running, sign in and click **Run now** on the dashboard. This runs the full search → score → email path on the Vercel/Node side (`/api/pipeline/run-now`), ignoring the schedule. The summary line under the button reports found/scored/sent counts and surfaces any errors.

## Scheduled path: edge function

```
curl.exe -s -X POST "https://crfmqodlqxxpjseyyxgi.supabase.co/functions/v1/run-scheduled-pipeline" -H "Authorization: Bearer <EDGE_FUNCTION_SECRET from .env>"
```

This only runs for users whose scheduled hour matches **right now** in their timezone. Two guards will make it report `usersDue: 0`:

1. **Schedule mismatch** — user's `schedule_hour`/day (in their timezone) isn't the current hour. Fix: set their schedule to the current hour in Settings, or watch GitHub Actions (`Actions → Hourly job search run → Run workflow`) at the right time.
2. **Min-gap guard** — an email was sent within the last 20h (daily) / 6d (weekly) / 27d (monthly). Clear it for testing:

```
node -e "require('dotenv').config();const p=require('postgres');const s=p(process.env.DATABASE_URL,{prepare:false});s\`update user_settings set last_email_sent_at=null\`.then(r=>{console.log('cleared',r.count);process.exit(0)})"
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
