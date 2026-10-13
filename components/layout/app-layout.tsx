import * as React from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { BreadcrumbNav, type BreadcrumbNavItem } from "./breadcrumb-nav";
import { cn } from "@/lib/utils";

/**
 * Content max-width options for different page types
 */
type ContentMaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full";

const maxWidthClasses: Record<ContentMaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

/**
 * Page header configuration for hero-style headers with title and description
 */
interface PageHeaderConfig {
  /** Page title */
  readonly title: string;
  /** Optional description below the title */
  readonly description?: string;
  /** Optional actions to render in the header (e.g., buttons) */
  readonly actions?: React.ReactNode;
  /** Whether to center the header content */
  readonly centered?: boolean;
  /** Background style */
  readonly background?: "muted" | "plain";
  /** Additional content below title/description (e.g., search bar) */
  readonly children?: React.ReactNode;
}

interface AppLayoutProps {
  /** Breadcrumb navigation items */
  readonly breadcrumbs?: readonly BreadcrumbNavItem[];
  /** Page header configuration for hero-style headers */
  readonly pageHeader?: PageHeaderConfig;
  /** Main content */
  readonly children: React.ReactNode;
  /** Max width for the main content area */
  readonly contentMaxWidth?: ContentMaxWidth;
  /** Custom className for the content section */
  readonly contentClassName?: string;
  /** Whether to skip the standard content wrapper (for custom layouts like home page) */
  readonly customContent?: boolean;
  /** Title for the form layout */
  readonly title?: string;
  /** Description for the form layout */
  readonly description?: string;
  /** Header children for the listing layout */
  readonly headerChildren?: React.ReactNode;
  /** Optional navigation component (e.g., sidebar) */
  readonly navigation?: React.ReactNode;
  /** The type of content being displayed */
  readonly contentType?: "default" | "form" | "table" | "dashboard" | "cards" | "wizard";
}

/**
 * PageHeader component for hero-style page headers
 */
function PageHeader({
  title,
  description,
  actions,
  centered = true,
  background = "muted",
  children,
}: PageHeaderConfig) {
  return (
    <section
      className={cn(
        "py-5 sm:py-7 md:py-10",
        background === "muted" && "border-be border-border/30 bg-muted/35",
      )}
    >
      <div className="container">
        <div className={cn(centered && "text-center")}>
          <h1 className="mbe-2 font-serif text-3xl font-bold text-foreground sm:mbe-3 sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
              {description}
            </p>
          )}
          {actions && (
            <div className={cn("mbs-4 sm:mbs-5", centered && "flex justify-center")}>{actions}</div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Consistent page layout component inspired by AWS Cloudscape AppLayout.
 * Provides standard slots for breadcrumbs, page header, and content areas.
 */
export function AppLayout({
  breadcrumbs,
  pageHeader,
  children,
  contentMaxWidth = "full",
  contentClassName,
  customContent = false,
  title,
  description,
  headerChildren,
  navigation,
  contentType = "default",
}: Readonly<AppLayoutProps>) {
  if ((contentType === "table" || contentType === "cards") && title) {
    pageHeader = {
      title,
      description,
      centered: true,
      background: "muted",
      children: headerChildren,
    };
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1">
        {navigation && <aside className="w-64 bg-gray-100 p-4">{navigation}</aside>}
        <main className="flex-1">
          {pageHeader ? (
            <div>
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div
                  className={cn(
                    "container",
                    pageHeader.background === "muted" && "bg-muted/30",
                    "pbs-4 pbe-1",
                  )}
                >
                  <BreadcrumbNav
                    items={breadcrumbs}
                    container={false}
                    className="mbe-0 text-muted-foreground [&_[data-slot=breadcrumb-list]]:text-sm [&_[data-slot=breadcrumb-list]]:text-muted-foreground"
                  />
                </div>
              )}
              <PageHeader {...pageHeader} />
            </div>
          ) : (
            breadcrumbs &&
            breadcrumbs.length > 0 && (
              <div className="container py-4">
                <BreadcrumbNav items={breadcrumbs} container={false} />
              </div>
            )
          )}

          {/* Main Content */}
          {customContent ? (
            children
          ) : (
            <section
              className={cn(
                "py-4 sm:py-8 md:py-10",
                contentType === "default" && "py-5 sm:py-9 md:py-12",
                contentType === "form" && "py-4 sm:py-6 md:py-8",
                contentClassName,
              )}
            >
              <div
                className={cn(
                  "container",
                  contentMaxWidth !== "full" && maxWidthClasses[contentMaxWidth],
                  contentMaxWidth !== "full" && "mx-auto",
                )}
              >
                {contentType === "form" && title && (
                  <>
                    <h1 className="mbe-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">
                      {title}
                    </h1>
                    {description && (
                      <p className="mbe-6 text-sm text-muted-foreground sm:mbe-8 sm:text-base">
                        {description}
                      </p>
                    )}
                  </>
                )}
                {children}
              </div>
            </section>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
