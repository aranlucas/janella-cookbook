import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { AppLayout } from "@/components/layout/app-layout";
import {
  ContentEmptyState,
  RecipeGridSkeleton,
} from "@/components/ui/content-state";
import type { RecipeWithRelations } from "@/types/recipe";

export const revalidate = 86400;

async function getFavoriteRecipes(): Promise<RecipeWithRelations[]> {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isFavorite: true },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
      orderBy: { title: "asc" },
    });
    return recipes as unknown as RecipeWithRelations[];
  } catch (error) {
    console.error("Error fetching favorite recipes:", error);
    return [];
  }
}

async function RecipeList() {
  const recipes = await getFavoriteRecipes();

  if (recipes.length === 0) {
    return (
      <ContentEmptyState
        icon="❤️"
        title="No favorites yet"
        description="Mark recipes as favorites to save them here for quick access."
        actionHref="/recipes"
        actionLabel="Browse Recipes"
      />
    );
  }

  return <RecipeGrid recipes={recipes} />;
}

export default async function FavoritesPage() {
  return (
    <AppLayout
      contentType="cards"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Your Favorites", active: true },
      ]}
      title="Your Favorites"
      description="A curated list of your most loved dishes."
    >
      <Suspense fallback={<RecipeGridSkeleton count={4} />}>
        <RecipeList />
      </Suspense>
    </AppLayout>
  );
}
