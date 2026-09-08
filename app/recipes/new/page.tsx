import { RecipeIntake } from "@/components/forms/recipe-intake";
import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Add Recipe | Cookbook",
  description: "Add a new recipe to your cookbook collection.",
  path: "/recipes/new",
});

export default async function AddRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  return (
    <AppLayout
      contentType="form"
      contentMaxWidth="5xl"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Recipes", href: "/recipes" },
        { label: "New Recipe", active: true },
      ]}
      title="Add a Recipe"
      description="A recipe worth keeping. Bring it in, check the details, make it yours."
    >
      <RecipeIntake initialLink={source} />
    </AppLayout>
  );
}
