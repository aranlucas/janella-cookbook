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
  readonly items: readonly BreadcrumbNavItem[];
  readonly className?: string;
  readonly container?: boolean;
  readonly maxWidth?: "3xl" | "4xl" | "5xl" | "none";
}

export function BreadcrumbNav({
  items,
  className,
  container = true,
  maxWidth = "none",
}: Readonly<BreadcrumbNavProps>) {
  const content = (
    <Breadcrumb className="[&_[data-slot=breadcrumb-list]]:text-muted-foreground/95 [&_[data-slot=breadcrumb-page]]:font-medium [&_[data-slot=breadcrumb-separator]]:text-muted-foreground/80">
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
        "no-print container pbs-2 pbe-4",
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
interface BreadcrumbContainerProps {
  readonly children: React.ReactNode;
}

export function BreadcrumbContainer({ children }: Readonly<BreadcrumbContainerProps>) {
  return <div className="no-print container py-4">{children}</div>;
}
