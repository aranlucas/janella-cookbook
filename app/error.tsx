"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/recipe/button-link";
import { StatusMessage } from "@/components/layout/status-message";

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

  const actions = (
    <>
      <Button size="lg" className="px-5" onClick={reset}>
        {wakingUp ? "Retry now" : "Try again"}
      </Button>
      <ButtonLink href="/" variant="outline" size="lg" className="px-5">
        Go home
      </ButtonLink>
    </>
  );

  if (wakingUp) {
    return (
      <StatusMessage
        kicker="One moment"
        title="Waking up the kitchen"
        description={`The database sleeps when nobody is cooking. It's starting now, and the page will retry in ${countdown}s.`}
        actions={actions}
        footnote="Code 57P03: database is starting up"
      />
    );
  }

  return (
    <StatusMessage
      kicker="Something went wrong"
      title="This page didn't load"
      description="Try again, or head back to the home page."
      actions={actions}
      footnote={error.digest ? `Error ID: ${error.digest}` : undefined}
    />
  );
}
