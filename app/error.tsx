"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md">
          <div className="mb-6 text-6xl">🫠</div>
          <h1 className="text-foreground mb-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            We hit a snag loading this page. It might be a temporary issue — give
            it another try.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset} size="lg">
              Try again
            </Button>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Go home
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
