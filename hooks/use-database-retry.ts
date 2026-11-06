"use client";

import { useEffect, useState } from "react";

function isWakingUp(error: Error): boolean {
  const message = error.message.toLowerCase();

  return [
    "starting up",
    "57p03",
    "database_unavailable",
    "p2039",
    "p1001",
    "can't reach database",
  ].some((fragment) => message.includes(fragment));
}

export function useDatabaseRetry(error: Error, reset: () => void) {
  const wakingUp = isWakingUp(error);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (wakingUp && countdown <= 0) {
      reset();
    }
  }, [countdown, reset, wakingUp]);

  useEffect(() => {
    if (!wakingUp || countdown <= 0) {
      return;
    }

    // Railway cold starts need time before another request can succeed.
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [wakingUp, countdown]);

  return { wakingUp, countdown };
}
