"use client";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/recipe/button-link";

interface PaginationControlsProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly baseUrl: string;
}

export function PaginationControls({ currentPage, totalPages, baseUrl }: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageSeparator = baseUrl.includes("?") ? "&" : "?";
  const getPageHref = (pageNumber: number) => `${baseUrl}${pageSeparator}page=${pageNumber}`;

  return (
    <div className="mbs-10 flex items-center justify-between gap-4 border-bs border-border/70 pbs-5">
      {currentPage > 1 ? (
        <ButtonLink href={getPageHref(currentPage - 1)} variant="outline">
          Previous
        </ButtonLink>
      ) : (
        <Button variant="outline" disabled>
          Previous
        </Button>
      )}
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <ButtonLink href={getPageHref(currentPage + 1)} variant="outline">
          Next
        </ButtonLink>
      ) : (
        <Button variant="outline" disabled>
          Next
        </Button>
      )}
    </div>
  );
}
