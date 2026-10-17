"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface SearchBarProps {
  readonly className?: string;
  readonly placeholder?: string;
  readonly size?: "default" | "large";
  readonly redirectTo?: string;
  readonly storageKey?: string;
}

export function SearchBar({
  className,
  placeholder = "Search recipes...",
  size = "default",
  redirectTo = "/search",
  storageKey = "janella_recent_searches",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();

      if (trimmed) {
        // Add squish animation to button
        buttonRef.current?.classList.add("animate-squish");
        setTimeout(() => buttonRef.current?.classList.remove("animate-squish"), 400);

        if (typeof window !== "undefined") {
          try {
            const existing = window.localStorage.getItem(storageKey);
            const parsed = existing ? z.array(z.string()).parse(JSON.parse(existing)) : [];
            const next = [trimmed, ...parsed.filter((item) => item !== trimmed)].slice(0, 8);
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // Ignore storage parsing failures and continue search navigation.
          }
        }

        const target = redirectTo || "/search";
        router.push(`${target}?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [query, router, redirectTo, storageKey],
  );

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-border bg-card p-1 transition duration-200",
          isFocused && "border-primary/60 ring-3 ring-primary/15",
          isLarge && "sm:rounded-2xl sm:p-1.5",
        )}
      >
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-s-3 inset-bs-1/2 size-4 -translate-y-1/2 text-muted-foreground",
              isLarge && "sm:inset-s-4 sm:size-5",
            )}
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "border-none bg-transparent ps-9 text-base shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent",
              isLarge && "h-10 sm:h-12 sm:ps-11 sm:text-lg md:text-lg",
            )}
          />
        </div>
        <Button
          ref={buttonRef}
          type="submit"
          className={cn(
            "shrink-0 rounded-lg px-4",
            isLarge && "h-10 sm:h-12 sm:rounded-xl sm:px-7 sm:text-base",
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
