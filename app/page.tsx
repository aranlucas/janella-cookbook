import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeWithRelations } from "@/types/recipe";

export const dynamic = "force-dynamic";

async function getRecentRecipes(): Promise<RecipeWithRelations[]> {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return recipes as unknown as RecipeWithRelations[];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}

async function getStats() {
  try {
    const [total, favorites] = await Promise.all([
      prisma.recipe.count(),
      prisma.recipe.count({ where: { isFavorite: true } }),
    ]);
    return { total, favorites };
  } catch {
    return { total: 0, favorites: 0 };
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

async function RecipeList() {
  const recipes = await getRecentRecipes();
  return <RecipeGrid recipes={recipes} />;
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="from-butter/30 to-cream relative overflow-x-clip bg-linear-to-b py-12 sm:py-16 md:py-24">
          <div className="relative z-10 container">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="text-charcoal font-serif text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Janella&apos;s
                <span className="text-terracotta"> Cookbook</span>
              </h1>
              <p className="text-muted-foreground mt-3 text-base sm:mt-4 sm:text-lg md:text-xl">
                Collect, organize, and discover recipes with intelligent search.
                Find what you&apos;re craving in seconds.
              </p>
              <div className="mt-6 sm:mt-8">
                <Suspense fallback={<div className="h-12 sm:h-14" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search for recipes..."
                    className="mx-auto max-w-3xl"
                  />
                </Suspense>
              </div>
              {stats.total > 0 && (
                <p className="text-muted-foreground mt-3 text-xs sm:mt-4 sm:text-sm">
                  {stats.total} recipe{stats.total !== 1 ? "s" : ""} in your
                  collection
                  {stats.favorites > 0 &&
                    ` • ${stats.favorites} favorite${
                      stats.favorites !== 1 ? "s" : ""
                    }`}
                </p>
              )}
            </div>
          </div>
          {/* Decorative elements */}
          <div className="bg-sage/10 absolute top-0 -left-20 h-48 w-48 rounded-full blur-3xl sm:h-64 sm:w-64" />
          <div className="bg-terracotta/10 absolute -right-20 bottom-0 h-48 w-48 rounded-full blur-3xl sm:h-64 sm:w-64" />
        </section>

        {/* Recipe Grid */}
        <section className="py-8 sm:py-12 md:py-16">
          <div className="container">
            <div className="mb-6 flex items-center justify-between sm:mb-8">
              <h2 className="text-charcoal font-serif text-xl font-semibold sm:text-2xl">
                Recent Recipes
              </h2>
            </div>
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
