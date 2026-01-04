import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeWithRelations } from "@/types/recipe";

// Revalidate every 60 seconds, or on-demand via revalidatePath("/")
export const revalidate = 60;

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
  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 via-background to-background grain relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden py-20 px-4">

          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <span className="mb-6 inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
                The Cookbook Collection
              </span>
              <h1 className="mb-6 font-serif text-6xl font-black tracking-tight text-foreground sm:text-7xl md:text-8xl lg:text-9xl">
                Janella&apos;s <br />
                <span className="text-primary italic">Kitchen.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg font-light leading-relaxed text-muted-foreground sm:text-x1 md:text-2xl">
                A curated collection of recipes, organized with care and discovered with intelligence.
                Good food, simply found.
              </p>

              <div className="mt-10 sm:mt-12">
                <Suspense fallback={<div className="h-14 sm:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Recipe Grid */}
        <section className="py-8 sm:py-6 md:py-16">
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
