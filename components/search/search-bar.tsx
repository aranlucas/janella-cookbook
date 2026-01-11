"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "default" | "large";
  redirectTo?: string;
}

export function SearchBar({
  className,
  placeholder = "Search recipes...",
  autoFocus = false,
  size = "default",
  redirectTo = "/search",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        const target = redirectTo || "/search";
        // If we represent the current page, we might ideally just push params, but full path is safe.
        router.push(`${target}?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router, redirectTo],
  );

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
            🔍
          </span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "bg-warm-white border-butter focus:border-terracotta w-full pl-10",
              size === "large" && "h-12 rounded-xl text-base sm:text-lg",
            )}
          />
        </div>
        <Button
          type="submit"
          className={cn(
            "bg-terracotta hover:bg-rust text-warm-white shrink-0",
            size === "large" && "h-12 rounded-xl px-4 text-base sm:px-6 sm:text-lg md:px-8",
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
