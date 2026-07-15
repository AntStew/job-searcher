export default function DashboardLoading() {
  return (
    <div className="flex animate-pulse flex-col">
      <div className="mb-10 h-8 w-2/3 rounded-lg bg-border/60" />
      <div className="flex flex-col gap-4 pb-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3 w-16 rounded bg-border/60" />
              <div className="h-5 w-24 rounded bg-border/60" />
            </div>
          ))}
        </div>
        <div className="h-9 w-28 self-end rounded-lg bg-border/60" />
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-10">
        <div className="h-5 w-36 rounded bg-border/60" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex w-full flex-col gap-2">
                <div className="h-4 w-1/2 rounded bg-border/60" />
                <div className="h-3 w-1/3 rounded bg-border/60" />
              </div>
              <div className="h-8 w-12 shrink-0 rounded-lg bg-border/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
