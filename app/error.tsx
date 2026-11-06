"use client";

import { useDatabaseRetry } from "@/hooks/use-database-retry";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/recipe/button-link";
import { StatusMessage } from "@/components/layout/status-message";

type RouteErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function Error({ error, reset }: RouteErrorProps) {
  const { wakingUp, countdown } = useDatabaseRetry(error, reset);

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
