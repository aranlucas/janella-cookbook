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
}

export function SearchBar({
  className,
  placeholder = "Search recipes...",
  autoFocus = false,
  size = "default",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            🔍
          </span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "pl-10 bg-warm-white border-butter focus:border-terracotta",
              size === "large" && "h-14 text-lg rounded-xl"
            )}
          />
        </div>
        <Button
          type="submit"
          className={cn(
            "bg-terracotta hover:bg-rust text-warm-white",
            size === "large" && "h-14 px-8 text-lg rounded-xl"
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
