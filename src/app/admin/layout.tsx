import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="relative border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-display text-sm font-semibold">
            Admin
          </Link>
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
            Back to dashboard
          </Link>
        </div>
        <div className="h-[3px] w-full bg-[linear-gradient(to_right,#f0b429,#ff8a5c,#e94f8a)]" />
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
