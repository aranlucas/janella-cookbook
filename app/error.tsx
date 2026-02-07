"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 text-5xl">🍳</span>
      <h2 className="mb-2 font-serif text-xl font-bold">
        Something went wrong
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">
        We couldn&apos;t load this page. Please try again or go back home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-terracotta hover:bg-rust rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border px-5 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          Go home
        </Link>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-gray-400">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
