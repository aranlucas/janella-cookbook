"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function isWakingUp(error: Error): boolean {
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("starting up") ||
    msg.includes("57p03") ||
    msg.includes("database_unavailable") ||
    msg.includes("p2039") ||
    msg.includes("p1001") ||
    msg.includes("can't reach database")
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const wakingUp = useMemo(() => isWakingUp(error), [error]);
  const [countdown, setCountdown] = useState(3);

  // Auto-retry when Railway DB is waking up — much nicer than making the user click
  useEffect(() => {
    if (!wakingUp) return;
    if (countdown <= 0) {
      reset();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [wakingUp, countdown, reset]);

  if (wakingUp) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span className="mb-4 animate-pulse text-5xl">☕</span>
        <h2 className="mb-2 font-serif text-xl font-bold">
          Waking up the kitchen...
        </h2>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          Railway scales the database to zero when idle. It&apos;s starting up
          now — retrying automatically in {countdown}s.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Retry now
          </button>
          <Link
            href="/"
            className="rounded-lg border px-5 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            Go home
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Code: 57P03 · database is starting up
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 text-5xl">🍳</span>
      <h2 className="mb-2 font-serif text-xl font-bold">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        We couldn&apos;t load this page. Please try again or go back home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
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
