import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Skeleton } from "@/components/ui/skeleton";
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
          <h3 className="text-charcoal font-serif text-2xl font-bold">
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
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="from-secondary/60 via-background to-background grain relative flex min-h-[65vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b px-4 py-16 md:py-20">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute top-20 left-10 h-24 w-24 rounded-full bg-[var(--highlight)]/10 blur-3xl md:h-40 md:w-40" />
          <div className="bg-primary/10 pointer-events-none absolute right-10 bottom-32 h-32 w-32 rounded-full blur-3xl md:h-48 md:w-48" />

          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <span className="border-primary/30 bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-bold tracking-wide uppercase">
                <span className="bg-primary inline-block h-2 w-2 animate-pulse rounded-full" />
                The Cookbook Collection
              </span>
              <h1 className="text-foreground mb-4 font-serif tracking-tight">
                Janella&apos;s <br />
                <span className="text-primary relative inline-block italic">
                  Kitchen.
                  <svg
                    className="absolute -right-4 -bottom-2 h-3 w-12 text-[var(--highlight)]"
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
              <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed sm:text-xl md:text-2xl">
                Good food,{" "}
                <span className="text-foreground font-semibold">
                  simply found.
                </span>
              </p>

              <div className="mt-8 sm:mt-10">
                <Suspense fallback={<div className="h-14 sm:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>

                {/* Quick Tags - bolder, more playful */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground mr-2 font-medium">
                    Try:
                  </span>
                  {[
                    { label: "Breakfast", emoji: "🍳" },
                    { label: "Pasta", emoji: "🍝" },
                    { label: "Dessert", emoji: "🍰" },
                    { label: "Vegan", emoji: "🥬" },
                    { label: "Quick & Easy", emoji: "⚡" },
                  ].map((tag) => (
                    <a
                      key={tag.label}
                      href={`/recipes?q=${encodeURIComponent(tag.label)}`}
                      className="bg-card border-border rounded-full border px-4 py-1.5 font-medium transition-all duration-200 hover:scale-105 hover:border-[var(--highlight)] hover:bg-[var(--highlight)] hover:text-[var(--highlight-foreground)]"
                    >
                      <span className="mr-1">{tag.emoji}</span>
                      {tag.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recipe Section */}
        <section className="overflow-hidden py-16 md:py-20">
          <div className="container">
            <div className="mb-12 text-center">
              <span className="bg-accent/10 text-accent mb-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase">
                Fresh from the kitchen
              </span>
              <h2 className="text-foreground font-serif text-4xl font-bold sm:text-5xl md:text-6xl">
                Recent Recipes
              </h2>
              <p className="text-muted-foreground mt-3 text-lg md:text-xl">
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
