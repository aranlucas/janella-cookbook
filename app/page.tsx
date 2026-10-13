import { Suspense } from "react";
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

    return recipes;
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
    <div className="flex flex-col gap-12">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full px-2 sm:px-3 md:px-4"
      >
        <CarouselContent>
          {recipes.slice(0, 10).map((recipe) => (
            <CarouselItem
              key={recipe.id}
              className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
            >
              <RecipeCard recipe={recipe} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mbs-8 flex justify-center gap-2">
          <CarouselPrevious variant="ghost" className="static translate-y-0" />
          <CarouselNext variant="ghost" className="static translate-y-0" />
        </div>
      </Carousel>

      {/* Show more recipes in a grid below the carousel if needed */}
      {recipes.length > 10 && (
        <div className="flex flex-col gap-8 pbs-8">
          <h3 className="font-serif text-2xl font-bold text-foreground">Explore More</h3>
          <RecipeGrid recipes={recipes.slice(10)} />
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="grain relative flex min-h-42vh flex-col items-center justify-center overflow-hidden bg-linear-to-b from-secondary/60 via-background to-background px-4 py-8 sm:min-h-50vh md:min-h-56vh md:py-14">
          {/* Floating food emojis */}
          <FloatingEmojis />

          {/* Decorative gradient blobs */}
          <div className="animate-float pointer-events-none absolute inset-s-4 inset-bs-10 size-20 rounded-full bg-highlight/10 blur-3xl sm:inset-s-10 sm:inset-bs-20 md:size-40" />
          <div
            className="pointer-events-none absolute inset-e-4 inset-be-16 size-24 rounded-full bg-primary/10 blur-3xl sm:inset-e-10 sm:inset-be-32 md:size-48"
            style={{ animationDelay: "2s" }}
          />

          <div className="relative z-10 container">
            <div className="mx-auto max-w-4xl text-center">
              <AnimatedBadge className="mbe-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-primary uppercase sm:mbe-4 sm:gap-2 sm:px-5 sm:py-2 sm:text-sm">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary sm:size-2" />
                The Cookbook Collection
              </AnimatedBadge>
              <AnimatedHeading className="mbe-3 font-serif text-3xl tracking-tight text-foreground sm:mbe-4 sm:text-4xl md:text-5xl lg:text-6xl">
                Janella&apos;s <br />
                <span className="relative inline-block text-primary italic">
                  Kitchen.
                  <AnimatedUnderline />
                </span>
              </AnimatedHeading>
              <AnimatedSubtitle className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl lg:text-2xl">
                Good food, <span className="font-semibold text-foreground">simply found.</span>
              </AnimatedSubtitle>

              <AnimatedSearchArea className="mbs-5 sm:mbs-7 md:mbs-8">
                <Suspense fallback={<div className="h-12 sm:h-14 md:h-16" />}>
                  <SearchBar
                    size="large"
                    placeholder="Search by ingredient, craving, or season..."
                    className="mx-auto max-w-2xl"
                  />
                </Suspense>

                {/* Quick Tags */}
                <div className="mbs-4 flex flex-wrap items-center justify-center gap-1.5 text-xs sm:mbs-6 sm:gap-2 sm:text-sm">
                  <span className="me-1 font-medium text-muted-foreground sm:me-2">Try:</span>
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
                      className="inline-flex cursor-pointer rounded-full border border-border bg-card px-3 py-1 font-medium transition-colors duration-200 hover:border-highlight hover:bg-highlight hover:text-highlight-foreground sm:px-4 sm:py-1.5"
                    >
                      <span className="me-0.5 sm:me-1">{tag.emoji}</span>
                      {tag.label}
                    </AnimatedTagPill>
                  ))}
                </div>
              </AnimatedSearchArea>
            </div>
          </div>
        </section>

        {/* Recipe Section */}
        <AnimatedSection className="overflow-hidden py-7 sm:py-10 md:py-12">
          <div className="container">
            <div className="mbe-8 text-center sm:mbe-12">
              <span className="mbe-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-3xs font-bold tracking-wider text-accent uppercase sm:mbe-3 sm:px-4 sm:py-1.5 sm:text-xs">
                Fresh from the kitchen
              </span>
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                Recent Recipes
              </h2>
              <p className="mbs-2 text-sm text-muted-foreground sm:mbs-3 sm:text-lg md:text-xl">
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
