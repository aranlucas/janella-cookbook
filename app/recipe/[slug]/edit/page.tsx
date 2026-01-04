import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
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
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="container flex-1 py-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/recipe/${recipe.slug}`}
            className="text-muted-foreground hover:text-terracotta mb-6 inline-flex items-center text-sm transition-colors"
          >
            ← Back to recipe
          </Link>

          <h1 className="text-charcoal mb-8 font-serif text-3xl font-bold">
            Edit Recipe
          </h1>

          <ManualRecipeForm initialData={recipe} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
