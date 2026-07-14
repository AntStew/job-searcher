---
name: deploy-pipeline
description: Runbook for shipping changes to the scheduled job-search pipeline — syncing the Deno mirror, running DB migrations, and redeploying the Supabase Edge Function.
---

# Deploy the scheduled pipeline

Follow this whenever pipeline logic (`src/lib/pipeline/`, `src/lib/email/`, `src/lib/jobSources/`) or the DB schema changes.

## 1. Sync the Deno mirror

Every changed file in `src/lib/…` that has a counterpart in `supabase/functions/_shared/` must be updated to match. The mirror files are identical except:

- imports use `npm:` specifiers (`npm:drizzle-orm`, `npm:zod`, `npm:@anthropic-ai/sdk`, `npm:resend`, `npm:postgres`)
- relative imports keep their `.ts` extension (`./schema.ts`)
- env access is `Deno.env.get("X")` not `process.env.X`
- the digest email renders via `digestEmailHtml.ts` (template literal), not React Email

Pure-logic mirrors with no imports at all (`taunts.ts`, `normalizeUrl.ts`, `digestWindow.ts`) are byte-identical — just `cp` them. The full mirrored-pair list lives in AGENTS.md.

Fastest safe path for pure-logic files (no env/imports beyond schema): `cp` the src file over the mirror, then fix the import lines with a targeted edit. Diff the two afterwards to confirm only the known differences remain.

## 2. Schema changes (if any)

```
npm run db:generate    # writes drizzle/<n>_*.sql — INSPECT IT before applying
npm run db:migrate     # applies to the live Supabase DB via DATABASE_URL in .env
```

Also update `supabase/functions/_shared/schema.ts` to match `src/db/schema.ts`.

Before applying enum-narrowing or column-dropping migrations, check live data won't violate them (query via `node -e` with `postgres` + dotenv).

## 3. Verify the Next.js side

```
npx tsc --noEmit
npm run test       # vitest unit tests (isDueToday, normalizeUrl, prompts, …)
npm run build      # needs placeholder env vars if .env is incomplete
```

(Deno mirror code is excluded from the Node typecheck — it only gets validated at deploy.)

## 4. Deploy the edge function

```
npx supabase functions deploy run-scheduled-pipeline --no-verify-jwt
```

`--no-verify-jwt` is required — the function authenticates with its own `EDGE_FUNCTION_SECRET` bearer token, not a Supabase JWT. New env vars must be set separately with `npx supabase secrets set KEY=value`.

## 5. Smoke-test

```
curl.exe -s -X POST "https://crfmqodlqxxpjseyyxgi.supabase.co/functions/v1/run-scheduled-pipeline" -H "Authorization: Bearer $EDGE_FUNCTION_SECRET"
```

(secret is in `.env`). `{"usersDue":0,...}` is a healthy response when nobody's scheduled hour matches — it proves auth + DB + logic all work. To force a real run, see the `test-pipeline` skill.
