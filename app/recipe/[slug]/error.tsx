"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RecipeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Recipe page error:", error);
  }, [error]);

  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md">
          <div className="mb-6 text-6xl">🥄</div>
          <h1 className="text-foreground mb-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Couldn&apos;t load recipe
          </h1>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Something went wrong while loading this recipe. Give it another try
            or head back to browse more recipes.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset} size="lg">
              Try again
            </Button>
            <Link
              href="/recipes"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Browse recipes
            </Link>
          </div>
          {error.digest && (
            <p className="text-muted-foreground/60 mt-8 text-xs">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
