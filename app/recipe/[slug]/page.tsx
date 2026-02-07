import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecipeMeta } from "@/components/recipe/recipe-meta";
import { IngredientList } from "@/components/recipe/ingredient-list";
import { InstructionSteps } from "@/components/recipe/instruction-steps";
import { NutritionFacts } from "@/components/recipe/nutrition-facts";
import { RecipeEngagementActions } from "./recipe-engagement-actions";
import { RecipeManagementActions } from "./recipe-management-actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RecipeImage } from "@/components/ui/recipe-image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { AppLayout } from "@/components/layout/app-layout";
import type { RecipeWithRelations } from "@/types/recipe";

export const revalidate = 86400;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const recipes = await prisma.recipe.findMany({
      select: { slug: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return recipes.map((recipe) => ({ slug: recipe.slug }));
  } catch {
    return [];
  }
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
    <AppLayout customContent>
      {/* Breadcrumbs and Actions */}
      <div className="no-print container flex items-center justify-between py-3 sm:py-4">
        <BreadcrumbNav
          container={false}
          items={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
            { label: recipe.title, active: true },
          ]}
        />
        <RecipeManagementActions recipe={recipe} />
      </div>

      {/* Recipe Header */}
      <section className="container pb-4 sm:pb-6 md:pb-8">
        <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl sm:rounded-lg md:rounded-xl">
            {recipe.imageUrl ? (
              <a
                href={recipe.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                <RecipeImage
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="hover:opacity-90"
                />
              </a>
            ) : (
              <RecipeImage src={null} alt={recipe.title} />
            )}
          </div>

          {/* Info */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div>
              <h1 className="text-charcoal font-serif text-xl font-bold sm:text-2xl md:text-3xl lg:text-4xl">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-muted-foreground mt-1.5 text-sm sm:mt-2 sm:text-base md:mt-3 md:text-lg">
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

            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Engagement Actions */}
            <div className="no-print pt-2">
              <RecipeEngagementActions recipe={recipe} />
            </div>
          </div>
        </div>
      </section>

      <Separator className="container" />

      {/* Recipe Content */}
      <section className="container py-4 sm:py-6 md:py-8">
        <div className="grid gap-5 sm:gap-6 md:gap-8 lg:grid-cols-[1fr_2fr]">
          {/* Ingredients */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-2.5 font-serif text-lg font-semibold sm:mb-3 sm:text-xl md:mb-4 md:text-2xl">
              Ingredients
            </h2>
            <div className="bg-warm-white recipe-content rounded-lg p-3 shadow-sm sm:p-4 md:p-6">
              <IngredientList ingredients={recipe.ingredients} />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-5 sm:space-y-6 md:space-y-8">
            <div>
              <h2 className="mb-2.5 font-serif text-lg font-semibold sm:mb-3 sm:text-xl md:mb-4 md:text-2xl">
                Instructions
              </h2>
              <div className="bg-warm-white recipe-content rounded-lg p-3 shadow-sm sm:p-4 md:p-6">
                <InstructionSteps instructions={recipe.instructions} />
              </div>
            </div>

            {/* Nutrition Facts */}
            <div className="no-print">
              <NutritionFacts recipe={recipe} />
            </div>
          </div>
        </div>
      </section>

      {/* Notes and Source */}
      {(recipe.notes || recipe.sourceUrl) && (
        <>
          <Separator className="container" />
          <section className="container py-6 md:py-8">
            {recipe.notes && (
              <Accordion className="max-w-2xl">
                <AccordionItem value="notes" className="border-none">
                  <AccordionTrigger className="py-2 font-serif text-lg font-semibold md:text-xl">
                    Notes
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm whitespace-pre-wrap md:text-base">
                    {recipe.notes}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {recipe.sourceUrl && (
              <div className="mt-8 border-t pt-8">
                <h3 className="mb-2 font-serif text-lg font-semibold md:text-xl">
                  Original Source
                </h3>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terracotta hover:text-rust flex items-center gap-2 text-sm break-all hover:underline md:text-base"
                >
                  <span className="shrink-0 text-xl">🔗</span>
                  {recipe.sourceUrl}
                </a>
              </div>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
