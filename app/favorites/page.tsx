import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { Skeleton } from "@/components/ui/skeleton";
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

function RecipeGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

async function RecipeList() {
  const recipes = await getFavoriteRecipes();

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 text-6xl">❤️</span>
        <h3 className="text-foreground mb-2 font-serif text-2xl font-semibold">
          No favorites yet
        </h3>
        <p className="text-muted-foreground max-w-md">
          Mark recipes as favorites to save them here for quick access.
        </p>
      </div>
    );
  }

  return <RecipeGrid recipes={recipes} />;
}

export default async function FavoritesPage() {
  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-muted/30 py-12 sm:py-16">
          <div className="container text-center">
            <h1 className="text-foreground mb-4 font-serif text-4xl font-bold sm:text-5xl">
              Your Favorites
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              A curated list of your most loved dishes.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container">
            <Suspense fallback={<RecipeGridSkeleton />}>
              <RecipeList />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
