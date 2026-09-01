"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const wakingUp = useMemo(() => isWakingUp(error), [error]);
  const [countdown, setCountdown] = useState(3);

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
      <html lang="en">
        <body className="font-sans antialiased">
          <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF6EC] px-4 text-center">
            <span className="mb-4 animate-pulse text-5xl">☕</span>
            <h1 className="mb-2 font-serif text-2xl font-bold text-[#2D2D2D]">
              Waking up the kitchen...
            </h1>
            <p className="mb-6 max-w-md text-sm text-[#6B7280]">
              The database is starting up — retrying automatically in {countdown}s.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-[#C4704B] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A0583B]"
            >
              Retry now
            </button>
            <p className="mt-4 text-xs text-[#9CA3AF]">Code: 57P03</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDF6EC] px-4 text-center">
          <span className="mb-4 text-5xl">🍳</span>
          <h1 className="mb-2 font-serif text-2xl font-bold text-[#2D2D2D]">
            Something went wrong
          </h1>
          <p className="mb-6 max-w-md text-sm text-[#6B7280]">
            We hit an unexpected error loading this page. This is usually
            temporary.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-[#C4704B] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#A0583B]"
          >
            Try again
          </button>
          {error.digest && (
            <p className="mt-4 text-xs text-[#9CA3AF]">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
