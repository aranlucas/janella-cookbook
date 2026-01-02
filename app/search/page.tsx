import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchBar } from "@/components/search/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchResults } from "./search-results";

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
        <div key={i} className="flex gap-4 p-4 bg-warm-white rounded-lg">
          <Skeleton className="w-32 h-24 rounded-md shrink-0" />
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
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-bold text-charcoal mb-6">
            Search Recipes
          </h1>

          <SearchBar
            size="large"
            placeholder="Search for recipes... try 'quick chicken dinner' or 'healthy breakfast'"
            autoFocus
            className="mb-8"
          />

          {query ? (
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                Showing results for &quot;{query}&quot;
              </p>
              <Suspense fallback={<SearchResultsSkeleton />}>
                <SearchResults query={query} />
              </Suspense>
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">🔍</span>
              <h2 className="font-serif text-xl font-semibold mb-2">
                Start searching
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try natural language queries like &quot;quick weeknight dinner&quot;,
                &quot;something with chicken and lemon&quot;, or &quot;healthy meal prep ideas&quot;.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
