"use client";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/recipe/button-link";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  baseUrl,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pageSeparator = baseUrl.includes("?") ? "&" : "?";
  const getPageHref = (pageNumber: number) =>
    `${baseUrl}${pageSeparator}page=${pageNumber}`;

  return (
    <div className="mt-12 flex items-center justify-center gap-4">
      {currentPage > 1 ? (
        <ButtonLink href={getPageHref(currentPage - 1)} variant="outline">
          Previous
        </ButtonLink>
      ) : (
        <Button variant="outline" disabled>
          Previous
        </Button>
      )}
      <span className="text-muted-foreground text-sm font-medium">
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
