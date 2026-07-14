"use client";

import { useActionState } from "react";
import { inviteUser, type InviteResult } from "./actions";
import { buttonPrimary, input } from "@/lib/ui";

const initialState: InviteResult | null = null;

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1">
        <input
          type="email"
          name="email"
          required
          placeholder="friend@example.com"
          className={input}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Inviting…" : "Send invite"}
      </button>
      {state?.ok === true && <span className="text-sm text-accent">Invited!</span>}
      {state?.ok === false && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
