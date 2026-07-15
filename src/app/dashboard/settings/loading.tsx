export default function SettingsLoading() {
  return (
    <div className="flex animate-pulse flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`flex flex-col gap-3 ${
            i === 0 ? "pb-10" : "border-t border-border py-10"
          }`}
        >
          <div className="h-5 w-32 rounded bg-border/60" />
          <div className="h-3 w-2/3 rounded bg-border/60" />
          <div className="h-24 w-full rounded-lg bg-border/60" />
        </div>
      ))}
    </div>
  );
}
