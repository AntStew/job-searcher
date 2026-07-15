export default function TrackerLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-10">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-48 rounded bg-border/60" />
        <div className="h-4 w-72 rounded bg-border/60" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-5 w-32 rounded bg-border/60" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-4">
                <div className="flex w-full flex-col gap-2">
                  <div className="h-4 w-1/2 rounded bg-border/60" />
                  <div className="h-3 w-1/3 rounded bg-border/60" />
                </div>
                <div className="h-8 w-12 shrink-0 rounded-lg bg-border/60" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
