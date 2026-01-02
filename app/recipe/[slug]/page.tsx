import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RecipeMeta } from "@/components/recipe/recipe-meta";
import { IngredientList } from "@/components/recipe/ingredient-list";
import { InstructionSteps } from "@/components/recipe/instruction-steps";
import { RecipeActionsClient } from "./recipe-actions-client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { RecipeWithRelations } from "@/types/recipe";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getRecipe(slug: string): Promise<RecipeWithRelations | null> {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
    });
    return recipe as unknown as RecipeWithRelations | null;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    return { title: "Recipe Not Found" };
  }

  return {
    title: `${recipe.title} | Cookbook`,
    description: recipe.description || `View the recipe for ${recipe.title}`,
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />

      <main className="flex-1">
        {/* Back link */}
        <div className="container py-4 no-print">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-terracotta transition-colors"
          >
            ← Back to recipes
          </Link>
        </div>

        {/* Recipe Header */}
        <section className="container pb-6 md:pb-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg md:rounded-xl bg-butter/30">
              {recipe.imageUrl ? (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl md:text-8xl opacity-30">🍽️</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-4 md:space-y-6">
              <div>
                <h1 className="font-serif text-2xl font-bold text-charcoal sm:text-3xl md:text-4xl">
                  {recipe.title}
                </h1>
                {recipe.description && (
                  <p className="mt-2 md:mt-3 text-base md:text-lg text-muted-foreground">
                    {recipe.description}
                  </p>
                )}
              </div>

              <RecipeMeta
                prepTime={recipe.prepTime}
                cookTime={recipe.cookTime}
                totalTime={recipe.totalTime}
                servings={recipe.servings}
                difficulty={recipe.difficulty}
                cuisine={recipe.cuisine}
                course={recipe.course}
                rating={recipe.rating}
                cookCount={recipe.cookCount}
              />

              <div className="no-print">
                <RecipeActionsClient recipe={recipe} />
              </div>

              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <Separator className="container" />

        {/* Recipe Content */}
        <section className="container py-6 md:py-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_2fr]">
            {/* Ingredients */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="font-serif text-xl md:text-2xl font-semibold mb-3 md:mb-4">
                Ingredients
              </h2>
              <div className="rounded-lg bg-warm-white p-4 md:p-6 shadow-sm recipe-content">
                <IngredientList ingredients={recipe.ingredients} />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-semibold mb-3 md:mb-4">
                Instructions
              </h2>
              <div className="rounded-lg bg-warm-white p-4 md:p-6 shadow-sm recipe-content">
                <InstructionSteps instructions={recipe.instructions} />
              </div>
            </div>
          </div>
        </section>

        {/* Notes and Source */}
        {(recipe.notes || recipe.sourceUrl) && (
          <>
            <Separator className="container" />
            <section className="container py-6 md:py-8">
              <div className="max-w-2xl space-y-4 md:space-y-6">
                {recipe.notes && (
                  <div>
                    <h3 className="font-serif text-lg md:text-xl font-semibold mb-2">
                      Notes
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                      {recipe.notes}
                    </p>
                  </div>
                )}

                {recipe.sourceUrl && (
                  <div>
                    <h3 className="font-serif text-lg md:text-xl font-semibold mb-2">
                      Source
                    </h3>
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-terracotta hover:underline break-all"
                    >
                      {recipe.sourceUrl}
                    </a>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
