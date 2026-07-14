"use client";

import { useState, useTransition } from "react";
import { setAdminLock } from "./actions";
import { buttonSecondary } from "@/lib/ui";

export function LockButton({ userId, locked }: { userId: string; locked: boolean }) {
  const [isLocked, setIsLocked] = useState(locked);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const next = !isLocked;
    if (next && !confirm("Permanently pause this user? Only you can unpause them.")) {
      return;
    }
    setIsLocked(next);
    startTransition(() => {
      void setAdminLock(userId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`${buttonSecondary} whitespace-nowrap px-3 py-1 text-xs`}
    >
      {isLocked ? "Unpause" : "Pause permanently"}
    </button>
  );
}
