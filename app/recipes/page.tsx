import { Suspense } from "react";
import { hybridSearch } from "@/lib/search";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { RecipeWithRelations } from "@/types/recipe";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";

export const revalidate = 86400;

interface RecipesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;

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
    const { prisma } = await import("@/lib/prisma");
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

function RecipeGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 flex items-center justify-center gap-4">
      {currentPage > 1 ? (
        <Link
          href={`${baseUrl}&page=${currentPage - 1}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Previous
        </Link>
      ) : (
        <Button variant="outline" disabled>
          Previous
        </Button>
      )}
      <span className="text-muted-foreground text-sm font-medium">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={`${baseUrl}&page=${currentPage + 1}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Next
        </Link>
      ) : (
        <Button variant="outline" disabled>
          Next
        </Button>
      )}
    </div>
  );
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
      <Empty className="py-20">
        <EmptyMedia variant="icon">
          <span className="text-4xl">🔍</span>
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No recipes found</EmptyTitle>
          <EmptyDescription>
            {query
              ? `We couldn't find anything matching "${query}".`
              : "Try adjusting your filters or search terms."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/recipes"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full px-8",
            )}
          >
            View All Recipes
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (category) baseParams.set("category", category);
  const baseUrl = `/recipes?${baseParams.toString()}`;

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
