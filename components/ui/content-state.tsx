import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
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
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  action?: ReactNode;
  className?: string;
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
      {(action || hasLinkAction) && (
        <EmptyContent>
          {action}
          {hasLinkAction && (
            <Link
              href={actionHref}
              className={cn(buttonVariants({ variant: "outline" }), "px-6")}
            >
              {actionLabel}
            </Link>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
}

interface CardListSkeletonProps {
  count?: number;
  className?: string;
}

export function CardListSkeleton({
  count = 6,
  className,
}: CardListSkeletonProps) {
  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card flex gap-4 rounded-lg p-4 shadow-sm">
          <Skeleton className="h-16 w-16 shrink-0 rounded-md sm:h-20 sm:w-24 md:h-24 md:w-32" />
          <div className="flex-1 space-y-2">
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
  count?: number;
  className?: string;
}

export function RecipeGridSkeleton({
  count = 8,
  className,
}: RecipeGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 sm:space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4 sm:h-6" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
