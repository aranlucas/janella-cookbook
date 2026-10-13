"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";

const DEFAULT_SUGGESTIONS = [
  "quick weeknight dinner",
  "high protein lunch",
  "easy breakfast",
  "meal prep ideas",
  "something with chicken",
  "vegetarian pasta",
] as const;

const STORAGE_KEY = "janella_recent_searches";

export function SearchDiscovery() {
  const [recentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const value = window.localStorage.getItem(STORAGE_KEY);

      if (!value) {
        return [];
      }

      const parsed: unknown = JSON.parse(value);
      const searchQueries = z.array(z.string()).safeParse(parsed);

      if (searchQueries.success) {
        return searchQueries.data.slice(0, 6);
      }
    } catch {
      // Ignore malformed storage values.
      return [];
    }

    return [];
  });

  return (
    <div className="flex flex-col gap-6">
      {recentSearches.length > 0 && (
        <section className="rounded-2xl border border-border/45 bg-card/70 p-4 sm:p-5">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Recent Searches
          </h2>
          <div className="mbs-3 flex flex-wrap gap-2">
            {recentSearches.map((query) => (
              <Link
                key={query}
                href={`/search?q=${encodeURIComponent(query)}`}
                className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground sm:text-sm"
              >
                {query}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/45 bg-card/70 p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">Try These</h2>
        <div className="mbs-3 flex flex-wrap gap-2">
          {DEFAULT_SUGGESTIONS.map((query) => (
            <Link
              key={query}
              href={`/search?q=${encodeURIComponent(query)}`}
              className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground sm:text-sm"
            >
              {query}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
