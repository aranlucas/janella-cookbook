import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusMessageProps {
  /** Short context shown above the title, e.g. "Error 404" */
  readonly kicker?: string;
  readonly title: string;
  readonly description: ReactNode;
  readonly actions?: ReactNode;
  readonly footnote?: ReactNode;
  readonly className?: string;
}

/** Full-height message for not-found and error pages */
export function StatusMessage({
  kicker,
  title,
  description,
  actions,
  footnote,
  className,
}: StatusMessageProps) {
  return (
    <div className={cn("container flex min-h-60vh flex-col justify-center py-12", className)}>
      <div className="max-w-2xl">
        {kicker && <p className="text-sm text-muted-foreground">{kicker}</p>}
        <h1 className="mbs-2 font-display text-5xl leading-display font-semibold text-foreground sm:text-6xl">
          {title}
        </h1>
        <p className="mbs-4 max-w-lg text-lg text-muted-foreground">{description}</p>
        {actions && <div className="mbs-7 flex flex-wrap gap-2">{actions}</div>}
        {footnote && <p className="mbs-6 text-xs text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  );
}
