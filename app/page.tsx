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
import {
  FloatingEmojis,
  AnimatedHeading,
  AnimatedUnderline,
  AnimatedSubtitle,
  AnimatedBadge,
  AnimatedSearchArea,
  AnimatedTagPill,
  AnimatedSection,
} from "@/components/layout/animated-hero";
import type { RecipeWithRelations } from "@/types/recipe";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Cookbook - Your Personal Recipe Collection",
  description:
    "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
  path: "/",
});

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
          <h3 className="font-serif text-2xl font-bold text-foreground">
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="grain relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-secondary/60 via-background to-background px-4 py-10 sm:min-h-[60vh] md:min-h-[65vh] md:py-20">
          {/* Floating food emojis */}
          <FloatingEmojis />

          {/* Decorative gradient blobs */}
          <div className="animate-float pointer-events-none absolute top-10 left-4 h-20 w-20 rounded-full bg-[var(--highlight)]/10 blur-3xl sm:top-20 sm:left-10 md:h-40 md:w-40" />
          <div
            className="pointer-events-none absolute right-4 bottom-16 h-24 w-24 rounded-full bg-primary/10 blur-3xl sm:right-10 sm:bottom-32 md:h-48 md:w-48"
            style={{ animationDelay: "2s" }}
          />

          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <AnimatedBadge className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-primary uppercase sm:mb-4 sm:gap-2 sm:px-5 sm:py-2 sm:text-sm">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary sm:h-2 sm:w-2" />
                The Cookbook Collection
              </AnimatedBadge>
              <AnimatedHeading className="mb-3 font-serif text-3xl tracking-tight text-foreground sm:mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
                Janella&apos;s <br />
                <span className="relative inline-block text-primary italic">
                  Kitchen.
                  <AnimatedUnderline />
                </span>
              </AnimatedHeading>
              <AnimatedSubtitle className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl lg:text-2xl">
                Good food,{" "}
                <span className="font-semibold text-foreground">
                  simply found.
                </span>
              </AnimatedSubtitle>

              <AnimatedSearchArea className="mt-6 sm:mt-8 md:mt-10">
                <Suspense fallback={<div className="h-12 sm:h-14 md:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>

                {/* Quick Tags */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:mt-8 sm:gap-2 sm:text-sm">
                  <span className="mr-1 font-medium text-muted-foreground sm:mr-2">
                    Try:
                  </span>
                  {[
                    { label: "Breakfast", emoji: "🍳" },
                    { label: "Pasta", emoji: "🍝" },
                    { label: "Dessert", emoji: "🍰" },
                    { label: "Vegan", emoji: "🥬" },
                    { label: "Quick & Easy", emoji: "⚡" },
                  ].map((tag, index) => (
                    <AnimatedTagPill
                      key={tag.label}
                      index={index}
                      href={`/recipes?q=${encodeURIComponent(tag.label)}`}
                      className="inline-flex cursor-pointer rounded-full border border-border bg-card px-3 py-1 font-medium transition-colors duration-200 hover:border-[var(--highlight)] hover:bg-[var(--highlight)] hover:text-[var(--highlight-foreground)] sm:px-4 sm:py-1.5"
                    >
                      <span className="mr-0.5 sm:mr-1">{tag.emoji}</span>
                      {tag.label}
                    </AnimatedTagPill>
                  ))}
                </div>
              </AnimatedSearchArea>
            </div>
          </div>
        </section>

        {/* Recipe Section */}
        <AnimatedSection className="overflow-hidden py-10 sm:py-14 md:py-20">
          <div className="container">
            <div className="mb-8 text-center sm:mb-12">
              <span className="mb-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-wider text-accent uppercase sm:mb-3 sm:px-4 sm:py-1.5 sm:text-xs">
                Fresh from the kitchen
              </span>
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                Recent Recipes
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-lg md:text-xl">
                The latest creations, ready for your table.
              </p>
            </div>
            <Suspense fallback={<RecipeGridSkeleton />}>
              <RecipeList />
            </Suspense>
          </div>
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
}
