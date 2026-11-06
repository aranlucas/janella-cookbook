"use client";

import { useState } from "react";
import Link from "next/link";
import { readRecentSearches } from "@/components/search/recent-searches";

const DEFAULT_SUGGESTIONS = [
  "quick weeknight dinner",
  "high protein lunch",
  "easy breakfast",
  "meal prep ideas",
  "something with chicken",
  "vegetarian pasta",
] as const;

export function SearchDiscovery() {
  const [recentSearches] = useState(() => readRecentSearches().slice(0, 6));

  const rows = [
    { label: "Recent", queries: recentSearches },
    { label: "Try", queries: DEFAULT_SUGGESTIONS },
  ].filter((row) => row.queries.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="w-14 shrink-0 text-muted-foreground">{row.label}</span>
          {row.queries.map((query) => (
            <Link
              key={query}
              href={`/search?q=${encodeURIComponent(query)}`}
              className="rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground transition-colors hover:border-highlight hover:bg-highlight hover:text-highlight-foreground"
            >
              {query}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
