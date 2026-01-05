import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/app-layout";
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
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-warm-white flex gap-4 rounded-lg p-4">
          <Skeleton className="h-24 w-32 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
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
      <h1 className="text-charcoal mb-4 font-serif text-2xl font-bold sm:mb-6 sm:text-3xl">
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
        <div className="py-16 text-center">
          <span className="mb-4 block text-6xl">🔍</span>
          <h2 className="mb-2 font-serif text-xl font-semibold">
            Start searching
          </h2>
          <p className="text-muted-foreground mx-auto max-w-md">
            Try natural language queries like &quot;quick weeknight
            dinner&quot;, &quot;something with chicken and lemon&quot;, or
            &quot;healthy meal prep ideas&quot;.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
