"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RouteErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

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

export default function Error({ error, reset }: RouteErrorProps) {
  const wakingUp = useMemo(() => isWakingUp(error), [error]);
  const [countdown, setCountdown] = useState(3);

  // Auto-retry when Railway DB is waking up — much nicer than making the user click
  useEffect(() => {
    if (wakingUp && countdown <= 0) {
      reset();
    }
  }, [countdown, reset, wakingUp]);

  useEffect(() => {
    if (!wakingUp || countdown <= 0) {
      return () => {};
    }

    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [wakingUp, countdown]);

  if (wakingUp) {
    return (
      <div className="flex min-h-60vh flex-col items-center justify-center px-4 text-center">
        <span className="mbe-4 animate-pulse text-5xl">☕</span>
        <h2 className="mbe-2 font-serif text-xl font-bold">Waking up the kitchen...</h2>
        <p className="mbe-6 max-w-md text-sm text-muted-foreground">
          Railway scales the database to zero when idle. It&apos;s starting up now — retrying
          automatically in {countdown}s.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
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
        <p className="mbs-4 text-xs text-gray-400">Code: 57P03 · database is starting up</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-60vh flex-col items-center justify-center px-4 text-center">
      <span className="mbe-4 text-5xl">🍳</span>
      <h2 className="mbe-2 font-serif text-xl font-bold">Something went wrong</h2>
      <p className="mbe-6 max-w-md text-sm text-muted-foreground">
        We couldn&apos;t load this page. Please try again or go back home.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
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
      {error.digest && <p className="mbs-4 text-xs text-gray-400">Error ID: {error.digest}</p>}
    </div>
  );
}
