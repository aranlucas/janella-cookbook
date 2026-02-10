import { Suspense } from "react";
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
  }>;
}

const ITEMS_PER_PAGE = 20;

export async function generateMetadata({
  searchParams,
}: RecipesPageProps): Promise<Metadata> {
  const { q, category } = await searchParams;

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
): Promise<{ recipes: RecipeWithRelations[]; total: number }> {
  try {
    // Use hybridSearch for sophisticated search capabilities
    if (query || category) {
      const searchQuery = query || category || "";
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const { results, total } = await hybridSearch(
        searchQuery,
        {},
        ITEMS_PER_PAGE,
        offset,
      );
      return { recipes: results.map((r) => r.recipe), total };
    }

    // If no search query, fall back to fetching all recipes (existing behavior)
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
          tags: true,
          images: true,
        },
        orderBy: { title: "asc" },
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
}: {
  query?: string;
  category?: string;
  page: number;
}) {
  const { recipes, total } = await getAllRecipes(query, category, page);

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
  const { q, category, page } = searchParams;
  const currentPage = Number(page) || 1;

  const title = category
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Recipes`
    : q
      ? `Search: "${q}"`
      : "All Recipes";

  const description = category
    ? `Browsing all ${category.toLowerCase()} recipes.`
    : "Explore the complete collection of tried and true favorites.";

  return (
    <AppLayout
      contentType="table"
      title={title}
      description={description}
      headerChildren={
        <div className="mx-auto mt-8 max-w-2xl">
          <Suspense>
            <SearchBar
              placeholder="Search within collection..."
              redirectTo="/recipes"
              size="large"
            />
          </Suspense>
        </div>
      }
    >
      <Suspense fallback={<RecipeGridSkeleton />}>
        <RecipeList query={q} category={category} page={currentPage} />
      </Suspense>
    </AppLayout>
  );
}
