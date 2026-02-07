import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlImportForm } from "@/components/forms/url-import-form";
import { TextImportForm } from "@/components/forms/text-import-form";
import { YouTubeImportForm } from "@/components/forms/youtube-import-form";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata = {
  title: "Add Recipe | Cookbook",
  description: "Add a new recipe to your cookbook collection",
};

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
      <Tabs defaultValue="url" className="space-y-4 sm:space-y-6">
        <TabsList className="bg-muted/50 grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger
            value="url"
            className="data-[state=active]:bg-card py-2 text-xs sm:text-sm"
          >
            From URL
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="data-[state=active]:bg-card py-2 text-xs sm:text-sm"
          >
            YouTube
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="data-[state=active]:bg-card py-2 text-xs sm:text-sm"
          >
            Paste Text
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-card py-2 text-xs sm:text-sm"
          >
            Manual
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
