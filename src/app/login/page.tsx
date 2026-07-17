"use client";

import { useActionState } from "react";
import { sendPasswordSetupLink, signInWithPassword, type LoginResult } from "./actions";
import { buttonPrimary, card, hint, input, label } from "@/lib/ui";

const initialState: LoginResult | null = null;

export default function LoginPage() {
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [setupState, setupAction, setupPending] = useActionState(
    sendPasswordSetupLink,
    initialState,
  );

  const pending = signInPending || setupPending;
  const error =
    signInState?.ok === false
      ? signInState.error
      : setupState?.ok === false
        ? setupState.error
        : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">Email and password. No inbox-diving required.</p>
      </div>

      <div className={card}>
        {setupState?.ok && setupState.sentSetupLink ? (
          <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink">
            <p>Link sent. Check your inbox to set your password, then come back and sign in.</p>
            <p className="mt-1 text-muted">
              Don&apos;t see it? Check your <strong>spam or junk folder</strong> — it can take a
              minute to arrive.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className={label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={input}
              />
            </div>
            <button type="submit" formAction={signInAction} disabled={pending} className={buttonPrimary}>
              {signInPending ? "Signing in…" : "Sign in"}
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              formAction={setupAction}
              disabled={pending}
              className={`${hint} text-left underline underline-offset-2 hover:text-ink`}
            >
              {setupPending
                ? "Sending link…"
                : "First time here or forgot your password? Email me a setup link."}
            </button>
          </form>
        )}
      </div>
      <p className={`${hint} text-center`}>
        New password links only work for a few minutes — use them fresh.
      </p>
    </main>
  );
}
