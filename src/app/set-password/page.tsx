"use client";

import { useActionState } from "react";
import { setPassword, type SetPasswordResult } from "./actions";
import { buttonPrimary, card, hint, input, label } from "@/lib/ui";

const initialState: SetPasswordResult = null;

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(setPassword, initialState);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-xl font-semibold">Set your password</h1>
        <p className="text-sm text-muted">
          Pick something you&apos;ll remember — this is what you&apos;ll sign in with from now on.
        </p>
      </div>

      <div className={card}>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className={label}>
              New password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={input}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirm" className={label}>
              Type it again
            </label>
            <input
              id="confirm"
              type="password"
              name="confirm"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Same as above"
              className={input}
            />
          </div>
          <button type="submit" disabled={pending} className={buttonPrimary}>
            {pending ? "Saving…" : "Save password"}
          </button>
          {state?.ok === false && <p className="text-sm text-danger">{state.error}</p>}
        </form>
      </div>
      <p className={`${hint} text-center`}>You&apos;ll land on your dashboard right after.</p>
    </main>
  );
}
