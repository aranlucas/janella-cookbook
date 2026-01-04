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
        <section className="from-primary/10 via-background to-background grain relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b px-4 py-12">
          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <span className="border-primary/20 bg-primary/5 text-primary mb-2 inline-block rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
                The Cookbook Collection
              </span>
              <h1 className="text-foreground mb-2 font-serif text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                Janella&apos;s <br />
                <span className="text-primary italic">Kitchen.</span>
              </h1>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed font-light sm:text-xl md:text-2xl">
                A curated collection of recipes, organized with care and
                discovered with intelligence. Good food, simply found.
              </p>

              <div className="mt-6 sm:mt-8">
                <Suspense fallback={<div className="h-14 sm:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>

                {/* Quick Tags */}
                <div className="text-muted-foreground mt-6 flex flex-wrap justify-center gap-2 text-sm">
                  <span className="mr-1 py-1">Popular:</span>
                  {[
                    "Breakfast",
                    "Pasta",
                    "Dessert",
                    "Vegan",
                    "Quick & Easy",
                  ].map((tag) => (
                    <a
                      key={tag}
                      href={`/recipes?q=${encodeURIComponent(tag)}`}
                      className="hover:text-primary hover:bg-primary/5 bg-background/50 border-border/50 rounded-full border px-3 py-1 transition-colors"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recipe Grid */}
        <section className="py-6 sm:py-4 md:py-10">
          <div className="container">
            <div className="mb-6 flex items-center justify-center text-center sm:mb-8">
              <h2 className="text-charcoal font-serif text-3xl font-bold sm:text-4xl">
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
