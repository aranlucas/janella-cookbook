import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/recipe/button-link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentEmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

export function ContentEmptyState({
  icon = "🍽️",
  title,
  description,
  actionHref,
  actionLabel,
  action,
  className,
}: ContentEmptyStateProps) {
  const hasLinkAction = !!actionHref && !!actionLabel;

  return (
    <Empty className={cn("py-16 sm:py-20", className)}>
      <EmptyMedia variant="icon">
        <span className="text-2xl">{icon}</span>
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {(action ?? hasLinkAction) && (
        <EmptyContent>
          {action}
          {hasLinkAction && (
            <ButtonLink href={actionHref} variant="outline" className="px-6">
              {actionLabel}
            </ButtonLink>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}

interface CardListSkeletonProps {
  readonly count?: number;
  readonly className?: string;
}

export function CardListSkeleton({ count = 6, className }: CardListSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:gap-4", className)}>
      {Array.from({ length: count }, (_, index) => `card-list-skeleton-${index}`).map((key) => (
        <div key={key} className="flex gap-4 rounded-lg bg-card p-4 shadow-sm">
          <Skeleton className="size-16 shrink-0 rounded-md sm:h-20 sm:w-24 md:h-24 md:w-32" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RecipeGridSkeletonProps {
  readonly count?: number;
  readonly className?: string;
}

export function RecipeGridSkeleton({ count = 8, className }: RecipeGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => `recipe-grid-skeleton-${index}`).map((key) => (
        <div key={key} className="flex flex-col gap-2 sm:gap-3">
          <Skeleton className="aspect-4/3 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4 sm:h-6" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
