import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { signOut } from "./actions";
import { DashboardHeader } from "./DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const isAdmin = user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <div className="min-h-screen">
      <DashboardHeader email={user?.email} isAdmin={!!isAdmin} signOut={signOut} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
