import { Suspense } from "react";
import { Search } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { AppLayout } from "@/components/layout/app-layout";
import { EmptyState, RecipeGridSkeleton } from "@/components/layout/page-state";
import { SearchResults } from "./search-results";
import { SearchDiscovery } from "@/components/search/search-discovery";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly searchParams: Promise<{ readonly q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q;
  const querySuffix = query ? `?q=${encodeURIComponent(query)}` : "";

  return createPageMetadata({
    title: query ? `"${query}" - Search | Cookbook` : "Search | Cookbook",
    description: "Search your recipe collection.",
    path: `/search${querySuffix}`,
  });
}

function SearchResultsSkeleton() {
  return <RecipeGridSkeleton count={8} />;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q ?? "";

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Search", active: true },
      ]}
      contentType="table"
      title="Search Recipes"
      description="Describe what you're in the mood for. Ingredients, cravings, and occasions all work."
      headerChildren={
        <div className="mbs-5 flex max-w-2xl flex-col gap-3">
          <Suspense fallback={<div className="h-12 sm:h-15" />}>
            <SearchBar size="large" placeholder="Search for recipes..." />
          </Suspense>
          <SearchDiscovery />
        </div>
      }
    >
      {query ? (
        <div>
          <p className="mbe-4 text-sm text-muted-foreground">
            Showing results for &quot;{query}&quot;
          </p>
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults query={query} />
          </Suspense>
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Start searching"
          description='Try natural language queries like "quick weeknight dinner", "something with chicken and lemon", or "healthy meal prep ideas".'
        />
      )}
    </AppLayout>
  );
}
