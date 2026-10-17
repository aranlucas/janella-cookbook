import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/recipe/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description: ReactNode;
  readonly actionHref?: string;
  readonly actionLabel?: string;
  /** Custom actions, rendered after the link action when both are given */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** Quiet placeholder for lists and pages with nothing to show yet */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  action,
  className,
}: EmptyStateProps) {
  const hasLinkAction = Boolean(actionHref) && Boolean(actionLabel);

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-foreground/15 px-6 py-12 text-center sm:py-16",
        className,
      )}
    >
      {Icon && <Icon className="mbe-4 size-7 text-muted-foreground" aria-hidden="true" />}
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="mbs-2 max-w-md text-base text-muted-foreground">{description}</p>
      {(hasLinkAction || action) && (
        <div className="mbs-6 flex flex-wrap items-center justify-center gap-2">
          {hasLinkAction && actionHref && (
            <ButtonLink href={actionHref} size="lg" className="px-5">
              {actionLabel}
            </ButtonLink>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

interface RecipeGridSkeletonProps {
  readonly count?: number;
  readonly className?: string;
}

/** Loading placeholder that matches RecipeGrid's columns and card shape */
export function RecipeGridSkeleton({ count = 8, className }: RecipeGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => `recipe-grid-skeleton-${index}`).map((key) => (
        <div key={key} className="flex flex-col gap-2.5">
          <Skeleton className="aspect-4/3 w-full rounded-2xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
