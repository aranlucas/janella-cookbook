import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hybridSearch } from "@/lib/search";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { ButtonLink } from "@/components/recipe/button-link";
import { PaginationControls } from "@/components/recipe/pagination-controls";
import {
  ContentEmptyState,
  RecipeGridSkeleton,
} from "@/components/ui/content-state";
import type { RecipeWithRelations } from "@/types/recipe";
import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const revalidate = 86400;

interface RecipesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
    sort?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;
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
  recipes: RecipeWithRelations[],
  sort: SortOption,
): RecipeWithRelations[] {
  return [...recipes].sort((a, b) => {
    switch (sort) {
      case "recent":
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "quick":
        return (
          (a.totalTime ?? Number.MAX_SAFE_INTEGER) -
          (b.totalTime ?? Number.MAX_SAFE_INTEGER)
        );
      case "favorites":
        if (a.isFavorite === b.isFavorite) {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
        return a.isFavorite ? -1 : 1;
      case "title":
      default:
        return a.title.localeCompare(b.title);
    }
  });
}

export async function generateMetadata({
  searchParams,
}: RecipesPageProps): Promise<Metadata> {
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
  if (q) query.set("q", q);
  if (category) query.set("category", category);
  if (normalizedSort !== "recent") query.set("sort", normalizedSort);
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
): Promise<{ recipes: RecipeWithRelations[]; total: number }> {
  try {
    // Use hybridSearch for sophisticated search capabilities
    if (query || category) {
      const searchQuery = query || category || "";
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const searchResult = await hybridSearch(
        searchQuery,
        {},
        ITEMS_PER_PAGE,
        offset,
      );
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

    const orderByMap: Record<SortOption, unknown> = {
      recent: { updatedAt: "desc" },
      newest: { createdAt: "desc" },
      title: { title: "asc" },
      quick: { totalTime: "asc" },
      favorites: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    };

    // If no search query, fall back to fetching all recipes (existing behavior)
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
          tags: true,
          images: true,
        },
        orderBy: orderByMap[sort] as
          | { updatedAt: "desc" }
          | { createdAt: "desc" }
          | { title: "asc" }
          | { totalTime: "asc" }
          | Array<{ isFavorite: "desc" } | { updatedAt: "desc" }>,
        take: ITEMS_PER_PAGE,
        skip: (page - 1) * ITEMS_PER_PAGE,
      }),
      prisma.recipe.count(),
    ]);

    return { recipes: recipes as unknown as RecipeWithRelations[], total };
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return { recipes: [], total: 0 };
  }
}

async function RecipeList({
  query,
  category,
  page,
  sort,
}: {
  query?: string;
  category?: string;
  page: number;
  sort: SortOption;
}) {
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
          <ButtonLink
            href="/recipes"
            variant="outline"
            className="rounded-full px-8"
          >
            View All Recipes
          </ButtonLink>
        }
      />
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (category) baseParams.set("category", category);
  if (sort !== "recent") baseParams.set("sort", sort);
  const baseQuery = baseParams.toString();
  const baseUrl = baseQuery ? `/recipes?${baseQuery}` : "/recipes";

  return (
    <div>
      <RecipeGrid recipes={recipes} />
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        baseUrl={baseUrl}
      />
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
  if (q) sharedParams.set("q", q);
  if (category) sharedParams.set("category", category);
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
        <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-4">
          <Suspense>
            <SearchBar
              placeholder="Search within collection..."
              redirectTo="/recipes"
              size="large"
            />
          </Suspense>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = option.value === currentSort;
              return (
                <Link
                  key={option.value}
                  href={buildSortHref(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                    isActive
                      ? "border-primary/40 bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      }
    >
      <Suspense fallback={<RecipeGridSkeleton />}>
        <RecipeList
          query={q}
          category={category}
          page={currentPage}
          sort={currentSort}
        />
      </Suspense>
    </AppLayout>
  );
}
