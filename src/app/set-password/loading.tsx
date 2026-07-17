export default function SetPasswordLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm animate-pulse flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-40 rounded bg-border/60" />
        <div className="h-4 w-64 rounded bg-border/60" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border p-6">
        <div className="h-9 w-full rounded-lg bg-border/60" />
        <div className="h-9 w-full rounded-lg bg-border/60" />
        <div className="h-9 w-full rounded-lg bg-border/60" />
      </div>
    </main>
  );
}
