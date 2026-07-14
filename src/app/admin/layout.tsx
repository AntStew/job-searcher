import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="relative bg-surface shadow-[0_1px_2px_rgba(23,26,28,0.06)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-display text-sm font-semibold">
            Admin
          </Link>
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
            Back to dashboard
          </Link>
        </div>
        <div className="h-[3px] w-full bg-[linear-gradient(to_right,#0f8a7a,#d9a441)]" />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
