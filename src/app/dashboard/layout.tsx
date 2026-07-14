import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { signOut } from "./actions";
import { NavLinks } from "./NavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const isAdmin = user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <div className="min-h-screen">
      <header className="relative bg-surface shadow-[0_1px_2px_rgba(23,26,28,0.06)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:px-6">
          <NavLinks isAdmin={!!isAdmin} />
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="hidden max-w-[180px] truncate sm:inline">{user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-danger hover:text-danger"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="h-[3px] w-full bg-[linear-gradient(to_right,#0f8a7a,#d9a441)]" />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
