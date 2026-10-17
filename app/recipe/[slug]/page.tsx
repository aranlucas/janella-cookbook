import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipeBySlug } from "@/lib/recipe-queries";
import { RecipeMeta } from "@/components/recipe/recipe-meta";
import { IngredientList } from "@/components/recipe/ingredient-list";
import { InstructionSteps } from "@/components/recipe/instruction-steps";
import { NutritionFacts } from "@/components/recipe/nutrition-facts";
import { RecipeEngagementActions } from "./recipe-engagement-actions";
import { RecipeManagementActions } from "./recipe-management-actions";
import { RecipeImage } from "@/components/ui/recipe-image";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { AppLayout } from "@/components/layout/app-layout";
import { createPageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import type { RecipeWithRelations } from "@/types/recipe";
import type { Metadata } from "next";

// Recipe edits must be visible immediately after saving.
export const dynamic = "force-dynamic";

export const dynamicParams = true;

interface PageProps {
  readonly params: Promise<{ readonly slug: string }>;
}

async function getRecipe(slug: string): Promise<RecipeWithRelations | null> {
  try {
    return await getRecipeBySlug(slug);
  } catch (error) {
    console.error("Error fetching recipe:", error);

    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    return createPageMetadata({
      title: "Recipe Not Found | Cookbook",
      description: "This recipe could not be found.",
      path: `/recipe/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${recipe.title} | Cookbook`,
    description: recipe.description ?? `View the recipe for ${recipe.title}`,
    path: `/recipe/${recipe.slug}`,
    image: recipe.imageUrl ?? undefined,
  });
}

function getHostname(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  const sourceHost = getHostname(recipe.sourceUrl);

  return (
    <AppLayout customContent>
      {/* Breadcrumbs and management actions */}
      <div className="no-print container flex items-center justify-between gap-4 pbs-4">
        <BreadcrumbNav
          container={false}
          items={[
            { label: "Home", href: "/" },
            { label: "Recipes", href: "/recipes" },
            { label: recipe.title, active: true },
          ]}
          className="min-w-0 [&_[data-slot=breadcrumb-list]]:text-sm"
        />
        <RecipeManagementActions recipe={recipe} />
      </div>

      {/* Recipe header */}
      <section className="container grid gap-6 pbs-4 pbe-8 sm:pbs-5 lg:grid-cols-12 lg:gap-10 lg:pbe-10">
        {recipe.imageUrl && (
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-muted lg:order-last lg:col-span-6 lg:self-start">
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
              />
            </a>
          </div>
        )}

        <div
          className={cn(
            "flex flex-col lg:pbs-2",
            recipe.imageUrl ? "lg:col-span-6" : "lg:col-span-9",
          )}
        >
          <h1 className="font-display text-4xl leading-display font-semibold text-balance text-foreground sm:text-5xl lg:text-6xl">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mbs-3 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {recipe.description}
            </p>
          )}

          <RecipeMeta
            className="mbs-5"
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
            <ul className="mbs-3 flex flex-wrap gap-1.5" aria-label="Tags">
              {recipe.tags.map((tag) => (
                <li key={tag.id}>
                  <Link
                    href={`/recipes?q=${encodeURIComponent(tag.name)}`}
                    className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Stays within thumb reach on phones while scrolling the recipe */}
          <div className="no-print sticky inset-be-3 z-30 mbs-6 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur sm:static sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
            <RecipeEngagementActions recipe={recipe} />
          </div>
        </div>
      </section>

      {/* Ingredients and method */}
      <section className="border-bs border-border/70">
        <div className="container grid gap-8 py-8 sm:py-10 lg:grid-cols-12 lg:gap-10">
          <aside className="lg:sticky lg:inset-bs-24 lg:col-span-5 lg:max-h-sticky-panel lg:self-start lg:overflow-y-auto xl:col-span-4">
            <div className="recipe-content rounded-3xl bg-card p-5 sm:p-6">
              <div className="mbe-3 flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ingredients</h2>
                <span className="text-sm text-muted-foreground">
                  {recipe.ingredients.length} {recipe.ingredients.length === 1 ? "item" : "items"}
                </span>
              </div>
              <IngredientList ingredients={recipe.ingredients} />
            </div>
          </aside>

          <div className="flex flex-col gap-10 lg:col-span-7 xl:col-span-8">
            <div className="recipe-content">
              <h2 className="mbe-5 font-display text-2xl font-semibold sm:text-3xl">
                Instructions
              </h2>
              <InstructionSteps instructions={recipe.instructions} />
            </div>

            {(Boolean(recipe.notes) || Boolean(sourceHost)) && (
              <div className="flex max-w-prose flex-col gap-6 border-bs border-border/70 pbs-8">
                {recipe.notes && (
                  <div>
                    <h2 className="mbe-3 font-display text-2xl font-semibold">Notes</h2>
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground sm:text-lg">
                      {recipe.notes}
                    </p>
                  </div>
                )}
                {recipe.sourceUrl && sourceHost && (
                  <p className="text-sm text-muted-foreground">
                    Originally from{" "}
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary"
                    >
                      {sourceHost}
                    </a>
                  </p>
                )}
              </div>
            )}

            <div className="no-print border-bs border-border/70 pbs-8">
              <NutritionFacts recipe={recipe} />
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
