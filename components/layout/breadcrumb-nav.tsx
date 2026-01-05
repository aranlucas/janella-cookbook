import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface BreadcrumbNavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbNavItem[];
  className?: string;
  container?: boolean;
  maxWidth?: "3xl" | "4xl" | "5xl" | "none";
}

export function BreadcrumbNav({
  items,
  className,
  container = true,
  maxWidth = "none",
}: BreadcrumbNavProps) {
  const content = (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={item.label}>
              <BreadcrumbItem>
                {item.active || isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );

  if (!container) {
    return content;
  }

  return (
    <nav
      className={cn(
        "no-print container pt-2 pb-4",
        maxWidth === "3xl" && "max-w-3xl",
        maxWidth === "4xl" && "max-w-4xl",
        maxWidth === "5xl" && "max-w-5xl",
        maxWidth !== "none" && "mx-auto w-full",
        className,
      )}
      aria-label="Breadcrumb"
    >
      {content}
    </nav>
  );
}

// Helper to wrap the breadcrumb in the same container as the detail page
export function BreadcrumbContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="no-print container py-4">{children}</div>;
}
