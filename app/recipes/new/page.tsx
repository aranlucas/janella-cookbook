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
      <div className="mb-5 rounded-2xl border border-border/45 bg-card/65 p-4 sm:mb-6 sm:p-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Recipe Import Flow
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">
              1. Choose Source
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              URL, YouTube, text paste, or manual.
            </p>
          </div>
          <div className="rounded-lg bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">
              2. Review Extracted Data
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verify ingredients and instruction structure.
            </p>
          </div>
          <div className="rounded-lg bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">
              3. Save and Edit
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save recipe, then fine-tune details in the editor.
            </p>
          </div>
        </div>
      </div>

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

      <div className="mt-6 rounded-xl border border-border/45 bg-card/65 p-4 text-sm text-muted-foreground">
        Tip: if a URL or video import is close but not perfect, save first and
        use the edit page for fast clean-up.
      </div>
    </AppLayout>
  );
}
