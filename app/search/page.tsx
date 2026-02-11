import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { AppLayout } from "@/components/layout/app-layout";
import {
  CardListSkeleton,
  ContentEmptyState,
} from "@/components/ui/content-state";
import { SearchResults } from "./search-results";
import { SearchDiscovery } from "@/components/search/search-discovery";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
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
      contentClassName="py-5 sm:py-7"
    >
      <h1 className="mb-4 font-serif text-2xl font-bold text-foreground sm:mb-6 sm:text-3xl">
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
          <p className="mb-6 text-sm text-muted-foreground">
            Showing results for &quot;{query}&quot;
          </p>
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults query={query} />
          </Suspense>
        </div>
      ) : (
        <div className="space-y-6">
          <ContentEmptyState
            icon="🔍"
            title="Start searching"
            description='Try natural language queries like "quick weeknight dinner", "something with chicken and lemon", or "healthy meal prep ideas".'
            className="border border-border/45 bg-card/70"
          />
          <SearchDiscovery />
        </div>
      )}
    </AppLayout>
  );
}
