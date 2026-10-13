"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex gap-1.5 transition-transform duration-300",
          isFocused && "scale-102",
        )}
      >
        <div className="relative flex-1">
          <span
            className={cn(
              "absolute inset-s-3 inset-bs-1/2 -translate-y-1/2 text-sm transition-transform duration-300 sm:text-base",
              isFocused && "scale-110 -rotate-12",
            )}
          >
            🔍
          </span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}

            className={cn(
              "border-border bg-card ps-9 text-base transition-shadow duration-300 focus:border-primary sm:ps-10 md:text-base",
              isFocused && "ring-3 ring-primary/15",
              size === "large" && "h-10 rounded-lg sm:h-12 sm:rounded-xl sm:text-lg md:text-lg",
            )}
          />
        </div>
        <Button
          ref={buttonRef}
          type="submit"
          className={cn(
            "bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-95",
            size === "large" &&
              "h-10 rounded-lg px-4 text-sm sm:h-12 sm:rounded-xl sm:px-8 sm:text-lg",
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
