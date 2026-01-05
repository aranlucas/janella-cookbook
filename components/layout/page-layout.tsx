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

interface PageLayoutProps {
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
  /** Whether to use the container class on content */
  contentContainer?: boolean;
  /** Whether to skip the standard content wrapper (for custom layouts like home page) */
  customContent?: boolean;
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
      className={cn("py-8 sm:py-12", background === "muted" && "bg-muted/30")}
    >
      <div className="container">
        <div className={cn(centered && "text-center")}>
          <h1 className="text-foreground mb-4 font-serif text-4xl font-bold sm:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              {description}
            </p>
          )}
          {actions && (
            <div className={cn("mt-6", centered && "flex justify-center")}>
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
 *
 * @example Basic content page
 * ```tsx
 * <PageLayout
 *   breadcrumbs={[
 *     { label: "Home", href: "/" },
 *     { label: "Privacy Policy", active: true },
 *   ]}
 *   contentMaxWidth="3xl"
 * >
 *   <h1>Privacy Policy</h1>
 *   ...
 * </PageLayout>
 * ```
 *
 * @example Listing page with header
 * ```tsx
 * <PageLayout
 *   breadcrumbs={[
 *     { label: "Home", href: "/" },
 *     { label: "Recipes", active: true },
 *   ]}
 *   pageHeader={{
 *     title: "All Recipes",
 *     description: "Browse the complete collection",
 *     children: <SearchBar />,
 *   }}
 * >
 *   <RecipeGrid recipes={recipes} />
 * </PageLayout>
 * ```
 */
export function PageLayout({
  breadcrumbs,
  pageHeader,
  children,
  contentMaxWidth = "full",
  contentClassName,
  contentContainer = true,
  customContent = false,
}: PageLayoutProps) {
  // Determine max-width class for breadcrumbs (should match content)
  const breadcrumbMaxWidth =
    contentMaxWidth === "full"
      ? "none"
      : contentMaxWidth === "3xl" ||
          contentMaxWidth === "4xl" ||
          contentMaxWidth === "5xl"
        ? contentMaxWidth
        : "none";

  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      {/* Breadcrumbs - only render here if there's no page header */}
      {breadcrumbs && breadcrumbs.length > 0 && !pageHeader && (
        <BreadcrumbNav
          items={breadcrumbs}
          maxWidth={breadcrumbMaxWidth as "3xl" | "4xl" | "5xl" | "none"}
        />
      )}

      <main className="flex-1">
        {/* Page Header (hero section) */}
        {pageHeader && (
          <div>
            {/* If breadcrumbs exist, render them inside the page header section */}
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
        )}

        {/* Main Content */}
        {customContent ? (
          children
        ) : (
          <section className={cn("py-8 sm:py-12", contentClassName)}>
            <div
              className={cn(
                contentContainer && "container",
                contentMaxWidth !== "full" && maxWidthClasses[contentMaxWidth],
                contentMaxWidth !== "full" && "mx-auto",
              )}
            >
              {children}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

/**
 * Convenience component for content pages (privacy, terms, about-style pages)
 */
export function ContentPageLayout({
  breadcrumbs,
  children,
  maxWidth = "3xl",
}: {
  breadcrumbs?: BreadcrumbNavItem[];
  children: React.ReactNode;
  maxWidth?: ContentMaxWidth;
}) {
  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      contentMaxWidth={maxWidth}
      contentClassName="py-12 sm:py-16"
    >
      {children}
    </PageLayout>
  );
}

/**
 * Convenience component for listing pages (recipes, favorites, categories)
 */
export function ListingPageLayout({
  breadcrumbs,
  title,
  description,
  headerChildren,
  children,
}: {
  breadcrumbs?: BreadcrumbNavItem[];
  title: string;
  description?: string;
  headerChildren?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      pageHeader={{
        title,
        description,
        centered: true,
        background: "muted",
        children: headerChildren,
      }}
    >
      {children}
    </PageLayout>
  );
}

/**
 * Convenience component for form pages (add recipe, edit recipe)
 */
export function FormPageLayout({
  breadcrumbs,
  title,
  description,
  children,
  maxWidth = "3xl",
}: {
  breadcrumbs?: BreadcrumbNavItem[];
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: ContentMaxWidth;
}) {
  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      contentMaxWidth={maxWidth}
      contentClassName="py-6 sm:py-8"
    >
      <h1 className="text-charcoal mb-2 font-serif text-2xl font-bold sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mb-6 text-sm sm:mb-8 sm:text-base">
          {description}
        </p>
      )}
      {children}
    </PageLayout>
  );
}
