import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
import { AppLayout } from "@/components/layout/app-layout";
import { createPageMetadata } from "@/lib/metadata";
import type { RecipeWithRelations } from "@/types/recipe";
import type { Metadata } from "next";

export const revalidate = 86400;

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    return createPageMetadata({
      title: "Recipe Not Found | Cookbook",
      description: "This recipe could not be found.",
      path: `/recipe/${slug}/edit`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `Edit ${recipe.title} | Cookbook`,
    description: `Update ingredients, instructions, and details for ${recipe.title}.`,
    path: `/recipe/${recipe.slug}/edit`,
    image: recipe.imageUrl || undefined,
    noIndex: true,
  });
}

export default async function EditRecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <AppLayout
      contentType="form"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Recipes", href: "/recipes" },
        { label: recipe.title, href: `/recipe/${recipe.slug}` },
        { label: "Edit", active: true },
      ]}
      title="Edit Recipe"
      description="Update details, ingredients, and steps. Changes are saved when you press Update Recipe."
      contentClassName="py-5 sm:py-7"
    >
      <ManualRecipeForm initialData={recipe} />
    </AppLayout>
  );
}
