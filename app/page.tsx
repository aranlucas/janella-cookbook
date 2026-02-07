import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeGridSkeleton } from "@/components/ui/content-state";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { RecipeWithRelations } from "@/types/recipe";

// Revalidate every 24 hours, or on-demand via revalidatePath("/")
export const revalidate = 86400;

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

async function RecipeList() {
  const recipes = await getRecentRecipes();

  if (recipes.length === 0) {
    return <RecipeGrid recipes={[]} />;
  }

  return (
    <div className="space-y-12">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {recipes.slice(0, 10).map((recipe) => (
            <CarouselItem
              key={recipe.id}
              className="pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
            >
              <RecipeCard recipe={recipe} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-8 flex justify-center gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>

      {/* Show more recipes in a grid below the carousel if needed */}
      {recipes.length > 10 && (
        <div className="space-y-8 pt-8">
          <h3 className="text-foreground font-serif text-2xl font-bold">
            Explore More
          </h3>
          <RecipeGrid recipes={recipes.slice(10)} />
        </div>
      )}
    </div>
  );
}

export default async function HomePage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="from-secondary/60 via-background to-background grain relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b px-4 py-10 sm:min-h-[60vh] md:min-h-[65vh] md:py-20">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute top-10 left-4 h-20 w-20 rounded-full bg-[var(--highlight)]/10 blur-3xl sm:top-20 sm:left-10 md:h-40 md:w-40" />
          <div className="bg-primary/10 pointer-events-none absolute right-4 bottom-16 h-24 w-24 rounded-full blur-3xl sm:right-10 sm:bottom-32 md:h-48 md:w-48" />

          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <span className="border-primary/30 bg-primary/10 text-primary mb-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase sm:mb-4 sm:gap-2 sm:px-5 sm:py-2 sm:text-sm">
                <span className="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full sm:h-2 sm:w-2" />
                The Cookbook Collection
              </span>
              <h1 className="text-foreground mb-3 font-serif text-3xl tracking-tight sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
                Janella&apos;s <br />
                <span className="text-primary relative inline-block italic">
                  Kitchen.
                  <svg
                    className="absolute -right-3 -bottom-1.5 h-2.5 w-10 text-[var(--highlight)] sm:-right-4 sm:-bottom-2 sm:h-3 sm:w-12"
                    viewBox="0 0 48 12"
                    fill="none"
                  >
                    <path
                      d="M2 8C12 4 36 2 46 6"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-muted-foreground mx-auto max-w-xl text-base leading-relaxed sm:text-lg md:text-xl lg:text-2xl">
                Good food,{" "}
                <span className="text-foreground font-semibold">
                  simply found.
                </span>
              </p>

              <div className="mt-6 sm:mt-8 md:mt-10">
                <Suspense fallback={<div className="h-12 sm:h-14 md:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>

                {/* Quick Tags */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:mt-8 sm:gap-2 sm:text-sm">
                  <span className="text-muted-foreground mr-1 font-medium sm:mr-2">
                    Try:
                  </span>
                  {[
                    { label: "Breakfast", emoji: "🍳" },
                    { label: "Pasta", emoji: "🍝" },
                    { label: "Dessert", emoji: "🍰" },
                    { label: "Vegan", emoji: "🥬" },
                    { label: "Quick & Easy", emoji: "⚡" },
                  ].map((tag) => (
                    <Link
                      key={tag.label}
                      href={`/recipes?q=${encodeURIComponent(tag.label)}`}
                      className="bg-card border-border rounded-full border px-3 py-1 font-medium transition-all duration-200 hover:scale-105 hover:border-[var(--highlight)] hover:bg-[var(--highlight)] hover:text-[var(--highlight-foreground)] sm:px-4 sm:py-1.5"
                    >
                      <span className="mr-0.5 sm:mr-1">{tag.emoji}</span>
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recipe Section */}
        <section className="overflow-hidden py-10 sm:py-14 md:py-20">
          <div className="container">
            <div className="mb-8 text-center sm:mb-12">
              <span className="bg-accent/10 text-accent mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase sm:mb-3 sm:px-4 sm:py-1.5 sm:text-xs">
                Fresh from the kitchen
              </span>
              <h2 className="text-foreground font-serif text-2xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
                Recent Recipes
              </h2>
              <p className="text-muted-foreground mt-2 text-sm sm:mt-3 sm:text-lg md:text-xl">
                The latest creations, ready for your table.
              </p>
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
