"use client";

import { useActionState } from "react";
import { sendMagicLink, type SendMagicLinkResult } from "./actions";

const initialState: SendMagicLinkResult | null = null;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-500">
        Enter your email and we&apos;ll send you a link to sign in — no password needed.
      </p>

      {state?.ok ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Check your inbox for a sign-in link.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending link…" : "Send sign-in link"}
          </button>
          {state?.ok === false && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
        </form>
      )}
    </main>
  );
}
