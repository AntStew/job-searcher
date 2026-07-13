"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkResult } from "./actions";
import { buttonPrimary, card, hint, input, label } from "@/lib/ui";

const initialState: SendMagicLinkResult | null = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-display font-semibold text-white">
          J
        </div>
        <h1 className="mt-2 font-display text-xl font-semibold">Job Search Assistant</h1>
        <p className="text-sm text-muted">
          Enter your email and we&apos;ll send a sign-in link — no password to remember.
        </p>
      </div>

      <div className={card}>
        {state?.ok ? (
          <p className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
            Check your inbox for a sign-in link.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className={input}
              />
            </div>
            <button type="submit" disabled={pending} className={buttonPrimary}>
              {pending ? "Sending link…" : "Send sign-in link"}
            </button>
            {state?.ok === false && <p className="text-sm text-danger">{state.error}</p>}
          </form>
        )}
      </div>
      <p className={`${hint} text-center`}>You&apos;ll get a link valid for a few minutes.</p>
    </main>
  );
}
