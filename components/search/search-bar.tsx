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
    [query, router],
  );

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
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
              "bg-warm-white border-butter focus:border-terracotta pl-10",
              size === "large" && "h-14 rounded-xl text-lg",
            )}
          />
        </div>
        <Button
          type="submit"
          className={cn(
            "bg-terracotta hover:bg-rust text-warm-white",
            size === "large" && "h-14 rounded-xl px-8 text-lg",
          )}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
