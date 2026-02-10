import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlImportForm } from "@/components/forms/url-import-form";
import { TextImportForm } from "@/components/forms/text-import-form";
import { YouTubeImportForm } from "@/components/forms/youtube-import-form";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Add Recipe | Cookbook",
  description: "Add a new recipe to your cookbook collection.",
  path: "/recipes/new",
});

export default function AddRecipePage() {
  return (
    <AppLayout
      contentType="form"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Recipes", href: "/recipes" },
        { label: "New Recipe", active: true },
      ]}
      title="Add a Recipe"
      description="Import from a website, paste text, or create from scratch."
    >
      <Tabs defaultValue="url" className="flex-col gap-4 sm:gap-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1 sm:grid-cols-4">
          <TabsTrigger
            value="url"
            className="rounded-md py-2 text-xs data-active:bg-card sm:text-sm"
          >
            <span className="mr-1">🔗</span> From URL
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="rounded-md py-2 text-xs data-active:bg-card sm:text-sm"
          >
            <span className="mr-1">▶️</span> YouTube
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="rounded-md py-2 text-xs data-active:bg-card sm:text-sm"
          >
            <span className="mr-1">📝</span> Paste Text
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="rounded-md py-2 text-xs data-active:bg-card sm:text-sm"
          >
            <span className="mr-1">✍️</span> Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url">
          <UrlImportForm />
        </TabsContent>

        <TabsContent value="youtube">
          <YouTubeImportForm />
        </TabsContent>

        <TabsContent value="text">
          <TextImportForm />
        </TabsContent>

        <TabsContent value="manual">
          <ManualRecipeForm />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
