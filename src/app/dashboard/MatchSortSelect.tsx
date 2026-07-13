"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { select } from "@/lib/ui";

const SORT_OPTIONS = [
  { value: "score", label: "Best match" },
  { value: "date", label: "Newest added" },
  { value: "salary", label: "Highest salary" },
] as const;

export function MatchSortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "score";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className={`${select} w-auto py-1.5 text-xs`}
      aria-label="Sort matches"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          Sort: {option.label}
        </option>
      ))}
    </select>
  );
}
