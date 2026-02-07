import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { AppLayout } from "@/components/layout/app-layout";
import { CardListSkeleton, ContentEmptyState } from "@/components/ui/content-state";
import { SearchResults } from "./search-results";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q;

  return {
    title: query ? `"${query}" - Search | Cookbook` : "Search | Cookbook",
    description: "Search your recipe collection",
  };
}

function SearchResultsSkeleton() {
  return <CardListSkeleton count={6} />;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || "";

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Search", active: true },
      ]}
      contentMaxWidth="4xl"
      contentClassName="py-6 sm:py-8"
    >
      <h1 className="text-foreground mb-4 font-serif text-2xl font-bold sm:mb-6 sm:text-3xl">
        Search Recipes
      </h1>

      <Suspense fallback={<div className="mb-6 h-12 sm:mb-8 sm:h-14" />}>
        <SearchBar
          size="large"
          placeholder="Search for recipes..."
          autoFocus
          className="mb-6 sm:mb-8"
        />
      </Suspense>

      {query ? (
        <div>
          <p className="text-muted-foreground mb-6 text-sm">
            Showing results for &quot;{query}&quot;
          </p>
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults query={query} />
          </Suspense>
        </div>
      ) : (
        <ContentEmptyState
          icon="🔍"
          title="Start searching"
          description='Try natural language queries like "quick weeknight dinner", "something with chicken and lemon", or "healthy meal prep ideas".'
        />
      )}
    </AppLayout>
  );
}
