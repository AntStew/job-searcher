import { card } from "@/lib/ui";

export default function SettingsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${card} flex flex-col gap-3`}>
          <div className="h-5 w-32 rounded bg-border/60" />
          <div className="h-3 w-2/3 rounded bg-border/60" />
          <div className="h-24 w-full rounded-lg bg-border/60" />
        </div>
      ))}
    </div>
  );
}
