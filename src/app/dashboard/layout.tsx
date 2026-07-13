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
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Job Search Assistant</span>
          <a href="/dashboard" className="text-sm text-gray-500 underline">
            Dashboard
          </a>
          <a href="/dashboard/settings" className="text-sm text-gray-500 underline">
            Settings
          </a>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{user?.email}</span>
          <form action={signOut}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
