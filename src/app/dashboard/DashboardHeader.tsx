"use client";

import { usePathname } from "next/navigation";
import { NavLinks } from "./NavLinks";

function headerBorderClass(pathname: string): string {
  if (pathname.startsWith("/dashboard/tracker")) return "border-green-500";
  if (pathname.startsWith("/dashboard/settings")) return "border-red-500";
  if (pathname.startsWith("/admin")) return "border-orange-500";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) return "border-violet-500";
  return "border-header-line";
}

export function DashboardHeader({
  email,
  isAdmin,
  signOut,
}: {
  email: string | undefined;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-ink/95 backdrop-blur-sm ${headerBorderClass(pathname)}`}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
        <NavLinks isAdmin={isAdmin} />
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span className="hidden max-w-[180px] truncate sm:inline">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-danger hover:text-danger"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
