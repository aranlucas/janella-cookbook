import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { AppLayout } from "@/components/layout/app-layout";
import { ButtonLink } from "@/components/recipe/button-link";
import {
  ContentEmptyState,
  RecipeGridSkeleton,
} from "@/components/ui/content-state";
import type { RecipeWithRelations } from "@/types/recipe";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Your Favorites | Cookbook",
  description: "A curated list of your most loved dishes.",
  path: "/favorites",
});

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

  if (recipes.length <= 3) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/45 bg-card/60 p-4 sm:p-6">
          <RecipeGrid recipes={recipes} />
        </div>
        <div className="rounded-2xl border border-border/45 bg-card/65 p-5 text-center sm:p-6">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Keep Building Your Favorites
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore more recipes and tap the heart to grow this list into your
            go-to lineup.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <ButtonLink href="/recipes" variant="outline">
              Browse All Recipes
            </ButtonLink>
            <ButtonLink href="/recipes?sort=quick" variant="default">
              Find Quick Dinners
            </ButtonLink>
          </div>
        </div>
      </div>
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
