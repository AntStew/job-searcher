export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <a href="/admin" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-display text-sm font-semibold text-white">
              J
            </span>
            <span className="font-display text-sm font-semibold">Admin</span>
          </a>
          <a href="/dashboard" className="text-sm text-muted hover:text-ink">
            Back to dashboard
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
