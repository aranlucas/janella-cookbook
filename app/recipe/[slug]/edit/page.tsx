import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
import { FormPageLayout } from "@/components/layout/page-layout";
import type { RecipeWithRelations } from "@/types/recipe";

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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    return { title: "Recipe Not Found" };
  }

  return {
    title: `Edit ${recipe.title} | Cookbook`,
  };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <FormPageLayout
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Recipes", href: "/recipes" },
        { label: recipe.title, href: `/recipe/${recipe.slug}` },
        { label: "Edit", active: true },
      ]}
      title="Edit Recipe"
      maxWidth="6xl"
    >
      <ManualRecipeForm initialData={recipe} />
    </FormPageLayout>
  );
}
