"use client";

import { useEffect, useMemo, useState } from "react";

type GlobalErrorProps = {
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
    msg.includes("p1001")
  );
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const wakingUp = useMemo(() => isWakingUp(error), [error]);
  const [countdown, setCountdown] = useState(3);

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
      <html lang="en">
        <body className="font-sans antialiased">
          <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <span className="mbe-4 animate-pulse text-5xl">☕</span>
            <h1 className="mbe-2 font-serif text-2xl font-bold text-foreground">
              Waking up the kitchen...
            </h1>
            <p className="mbe-6 max-w-md text-sm text-muted-foreground">
              The database is starting up — retrying automatically in {countdown}s.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Retry now
            </button>
            <p className="mbs-4 text-xs text-muted-foreground">Code: 57P03</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
          <span className="mbe-4 text-5xl">🍳</span>
          <h1 className="mbe-2 font-serif text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="mbe-6 max-w-md text-sm text-muted-foreground">
            We hit an unexpected error loading this page. This is usually temporary.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          {error.digest && (
            <p className="mbs-4 text-xs text-muted-foreground">Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
