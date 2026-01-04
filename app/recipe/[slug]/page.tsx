import { notFound } from "next/navigation";
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
        instructions: { orderBy: { sortOrder: "asc" } },
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
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Back link */}
        <div className="no-print container py-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-terracotta inline-flex items-center text-sm transition-colors"
          >
            ← Back to recipes
          </Link>
        </div>

        {/* Recipe Header */}
        <section className="container pb-6 md:pb-8">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            {/* Image */}
            <div className="bg-butter/30 relative aspect-[4/3] overflow-hidden rounded-lg md:rounded-xl">
              {recipe.imageUrl ? (
                <a
                  href={recipe.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="h-full w-full object-cover transition-opacity hover:opacity-90"
                  />
                </a>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl opacity-30 md:text-8xl">🍽️</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-4 md:space-y-6">
              <div>
                <h1 className="text-charcoal font-serif text-2xl font-bold sm:text-3xl md:text-4xl">
                  {recipe.title}
                </h1>
                {recipe.description && (
                  <p className="text-muted-foreground mt-2 text-base md:mt-3 md:text-lg">
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
              <h2 className="mb-3 font-serif text-xl font-semibold md:mb-4 md:text-2xl">
                Ingredients
              </h2>
              <div className="bg-warm-white recipe-content rounded-lg p-4 shadow-sm md:p-6">
                <IngredientList ingredients={recipe.ingredients} />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h2 className="mb-3 font-serif text-xl font-semibold md:mb-4 md:text-2xl">
                Instructions
              </h2>
              <div className="bg-warm-white recipe-content rounded-lg p-4 shadow-sm md:p-6">
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
                    <h3 className="mb-2 font-serif text-lg font-semibold md:text-xl">
                      Notes
                    </h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap md:text-base">
                      {recipe.notes}
                    </p>
                  </div>
                )}

                {recipe.sourceUrl && (
                  <div>
                    <h3 className="mb-2 font-serif text-lg font-semibold md:text-xl">
                      Source
                    </h3>
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta text-sm break-all hover:underline md:text-base"
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
