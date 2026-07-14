"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkResult } from "./actions";
import { buttonPrimary, card, hint, input, label } from "@/lib/ui";

const initialState: SendMagicLinkResult | null = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">💀</span>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          <span className="text-loot">UNEMPLOYMENT FINAL BOSS</span>
        </h1>
        <p className="text-sm text-muted">
          Drop your email, get a magic link. Passwords are for people with jobs.
        </p>
      </div>

      <div className={card}>
        {state?.ok ? (
          <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
            <p>Link sent. Go check your inbox — it&apos;s the first step, you got this.</p>
            <p className="mt-1 text-muted">
              Don&apos;t see it? Check your <strong>spam or junk folder</strong> — it can take a
              minute to arrive.
            </p>
          </div>
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
