import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-display text-sm font-semibold text-white">
                J
              </span>
              <span className="font-display text-sm font-semibold">Job Search Assistant</span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <a href="/dashboard" className="hover:text-ink">
                Matches
              </a>
              <a href="/dashboard/settings" className="hover:text-ink">
                Settings
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
