import { card } from "@/lib/ui";

export default function AdminLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-24 rounded bg-border/60" />
        <div className="h-4 w-80 rounded bg-border/60" />
      </div>
      <div className={`${card} flex flex-col gap-3`}>
        <div className="h-5 w-36 rounded bg-border/60" />
        <div className="h-9 w-full rounded-lg bg-border/60" />
      </div>
      <div className={card}>
        <div className="h-5 w-16 rounded bg-border/60" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-full rounded bg-border/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
