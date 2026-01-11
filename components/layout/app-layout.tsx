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
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional actions to render in the header (e.g., buttons) */
  actions?: React.ReactNode;
  /** Whether to center the header content */
  centered?: boolean;
  /** Background style */
  background?: "muted" | "plain";
  /** Additional content below title/description (e.g., search bar) */
  children?: React.ReactNode;
}

interface AppLayoutProps {
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbNavItem[];
  /** Page header configuration for hero-style headers */
  pageHeader?: PageHeaderConfig;
  /** Main content */
  children: React.ReactNode;
  /** Max width for the main content area */
  contentMaxWidth?: ContentMaxWidth;
  /** Custom className for the content section */
  contentClassName?: string;
  /** Whether to skip the standard content wrapper (for custom layouts like home page) */
  customContent?: boolean;
  /** Title for the form layout */
  title?: string;
  /** Description for the form layout */
  description?: string;
  /** Header children for the listing layout */
  headerChildren?: React.ReactNode;
  /** Optional navigation component (e.g., sidebar) */
  navigation?: React.ReactNode;
  /** The type of content being displayed */
  contentType?: "default" | "form" | "table" | "dashboard" | "cards" | "wizard";
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
      className={cn("py-6 sm:py-10 md:py-12", background === "muted" && "bg-muted/30")}
    >
      <div className="container">
        <div className={cn(centered && "text-center")}>
          <h1 className="text-foreground mb-3 font-serif text-3xl font-bold sm:mb-4 sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:text-lg">
              {description}
            </p>
          )}
          {actions && (
            <div className={cn("mt-4 sm:mt-6", centered && "flex justify-center")}>
              {actions}
            </div>
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
}: AppLayoutProps) {
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
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1">
        {navigation && (
          <aside className="w-64 bg-gray-100 p-4">{navigation}</aside>
        )}
        <main className="flex-1">
          {pageHeader ? (
            <div>
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div
                  className={cn(
                    "container",
                    pageHeader.background === "muted" && "bg-muted/30",
                    "pt-4 pb-0",
                  )}
                >
                  <BreadcrumbNav
                    items={breadcrumbs}
                    container={false}
                    className="mb-0"
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
                "py-8 sm:py-12",
                contentType === "default" && "py-12 sm:py-16",
                contentType === "form" && "py-6 sm:py-8",
                contentClassName,
              )}
            >
              <div
                className={cn(
                  "container",
                  contentMaxWidth !== "full" &&
                    maxWidthClasses[contentMaxWidth],
                  contentMaxWidth !== "full" && "mx-auto",
                )}
              >
                {contentType === "form" && title && (
                  <>
                    <h1 className="text-charcoal mb-2 font-serif text-2xl font-bold sm:text-3xl">
                      {title}
                    </h1>
                    {description && (
                      <p className="text-muted-foreground mb-6 text-sm sm:mb-8 sm:text-base">
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
