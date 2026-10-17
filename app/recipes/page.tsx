import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { listRecipes } from "@/lib/recipe-queries";
import { hybridSearch } from "@/lib/search";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { ButtonLink } from "@/components/recipe/button-link";
import { PaginationControls } from "@/components/recipe/pagination-controls";
import { ContentEmptyState, RecipeGridSkeleton } from "@/components/ui/content-state";
import type { RecipeWithRelations } from "@/types/recipe";
import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const revalidate = 86400;

interface RecipesPageProps {
  readonly searchParams: Promise<{
    readonly q?: string;
    readonly category?: string;
    readonly page?: string;
    readonly sort?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;

type RecipeQueryResult = {
  readonly recipes: readonly RecipeWithRelations[];
  readonly total: number;
};

type RecipeListProps = {
  readonly query?: string;
  readonly category?: string;
  readonly page: number;
  readonly sort: SortOption;
};

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "A-Z" },
  { value: "quick", label: "Quickest" },
  { value: "favorites", label: "Favorites First" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

function isSortOption(value?: string): value is SortOption {
  return Boolean(SORT_OPTIONS.find((option) => option.value === value));
}

function sortRecipesInMemory(
  recipes: readonly RecipeWithRelations[],
  sort: SortOption,
): RecipeWithRelations[] {
  return [...recipes].toSorted((a, b) => {
    switch (sort) {
      case "recent":
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "quick":
        return (a.totalTime ?? Number.MAX_SAFE_INTEGER) - (b.totalTime ?? Number.MAX_SAFE_INTEGER);
      case "favorites":
        if (a.isFavorite === b.isFavorite) {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }

        return a.isFavorite ? -1 : 1;

      case "title": {
        throw new Error('Not implemented yet: "title" case');
      }

      default:
        return a.title.localeCompare(b.title);
    }
  });
}

export async function generateMetadata({ searchParams }: RecipesPageProps): Promise<Metadata> {
  const { q, category, sort } = await searchParams;
  const normalizedSort: SortOption = isSortOption(sort) ? sort : "recent";

  const title = category
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Recipes | Cookbook`
    : q
      ? `Search: "${q}" | Cookbook`
      : "All Recipes | Cookbook";

  const description = category
    ? `Browsing all ${category.toLowerCase()} recipes.`
    : q
      ? `Search results for "${q}" in your recipe collection.`
      : "Explore the complete collection of tried and true favorites.";

  const query = new URLSearchParams();

  if (q) {
    query.set("q", q);
  }

  if (category) {
    query.set("category", category);
  }

  if (normalizedSort !== "recent") {
    query.set("sort", normalizedSort);
  }

  const queryString = query.toString();

  return createPageMetadata({
    title,
    description,
    path: `/recipes${queryString ? `?${queryString}` : ""}`,
  });
}

async function getAllRecipes(
  query?: string,
  category?: string,
  page: number = 1,
  sort: SortOption = "recent",
): Promise<RecipeQueryResult> {
  try {
    // Use hybridSearch for sophisticated search capabilities
    if (query || category) {
      const searchQuery = query ?? category ?? "";
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const searchResult = await hybridSearch(searchQuery, {}, ITEMS_PER_PAGE, offset);

      if (searchResult.isErr()) {
        console.error("Search error:", searchResult.error);

        return { recipes: [], total: 0 };
      }

      return {
        recipes: sortRecipesInMemory(
          searchResult.value.results.map((r) => r.recipe),
          sort,
        ),
        total: searchResult.value.total,
      };
    }

    const orderByMap: Record<
      SortOption,
      Prisma.RecipeOrderByWithRelationInput | Prisma.RecipeOrderByWithRelationInput[]
    > = {
      recent: { updatedAt: "desc" },
      newest: { createdAt: "desc" },
      title: { title: "asc" },
      quick: { totalTime: "asc" },
      favorites: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    };

    return await listRecipes({
      orderBy: orderByMap[sort],
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);

    return { recipes: [], total: 0 };
  }
}

async function RecipeList({ query, category, page, sort }: RecipeListProps) {
  const { recipes, total } = await getAllRecipes(query, category, page, sort);

  if (recipes.length === 0) {
    return (
      <ContentEmptyState
        icon="🔍"
        title="No recipes found"
        description={
          query
            ? `We couldn't find anything matching "${query}".`
            : "Try adjusting your filters or search terms."
        }
        action={
          <ButtonLink href="/recipes" variant="outline" className="rounded-full px-8">
            View All Recipes
          </ButtonLink>
        }
      />
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const baseParams = new URLSearchParams();

  if (query) {
    baseParams.set("q", query);
  }

  if (category) {
    baseParams.set("category", category);
  }

  if (sort !== "recent") {
    baseParams.set("sort", sort);
  }

  const baseQuery = baseParams.toString();
  const baseUrl = baseQuery ? `/recipes?${baseQuery}` : "/recipes";

  const firstShown = (page - 1) * ITEMS_PER_PAGE + 1;
  const lastShown = firstShown + recipes.length - 1;

  return (
    <div>
      <p className="mbe-4 text-sm text-muted-foreground">
        {total <= ITEMS_PER_PAGE
          ? `${total} ${total === 1 ? "recipe" : "recipes"}`
          : `Showing ${firstShown}–${lastShown} of ${total} recipes`}
      </p>
      <RecipeGrid recipes={recipes} />
      <PaginationControls currentPage={page} totalPages={totalPages} baseUrl={baseUrl} />
    </div>
  );
}

export default async function RecipesPage(props: RecipesPageProps) {
  const searchParams = await props.searchParams;
  const { q, category, page, sort } = searchParams;
  const currentPage = Number(page) || 1;
  const currentSort: SortOption = isSortOption(sort) ? sort : "recent";

  const title = category
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Recipes`
    : q
      ? `Search: "${q}"`
      : "All Recipes";

  const description = category
    ? `Browsing all ${category.toLowerCase()} recipes.`
    : "Explore the complete collection of tried and true favorites.";

  const sharedParams = new URLSearchParams();

  if (q) {
    sharedParams.set("q", q);
  }

  if (category) {
    sharedParams.set("category", category);
  }

  const buildSortHref = (sortValue: SortOption) => {
    const params = new URLSearchParams(sharedParams);

    if (sortValue !== "recent") {
      params.set("sort", sortValue);
    }

    return params.toString() ? `/recipes?${params.toString()}` : "/recipes";
  };

  return (
    <AppLayout
      contentType="table"
      title={title}
      description={description}
      headerChildren={
        <div className="mbs-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Suspense>
            <SearchBar
              placeholder="Search within collection..."
              redirectTo="/recipes"
              className="w-full max-w-xl"
            />
          </Suspense>
          <nav aria-label="Sort recipes" className="-mx-1 flex items-center gap-1 overflow-x-auto">
            <span className="shrink-0 px-1 text-sm text-muted-foreground">Sort</span>
            {SORT_OPTIONS.map((option) => {
              const isActive = option.value === currentSort;

              return (
                <Link
                  key={option.value}
                  href={buildSortHref(option.value)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>
      }
    >
      <Suspense fallback={<RecipeGridSkeleton className="2xl:grid-cols-4" />}>
        <RecipeList query={q} category={category} page={currentPage} sort={currentSort} />
      </Suspense>
    </AppLayout>
  );
}
