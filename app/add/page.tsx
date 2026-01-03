import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlImportForm } from "@/components/forms/url-import-form";
import { TextImportForm } from "@/components/forms/text-import-form";
import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";

export const metadata = {
  title: "Add Recipe | Cookbook",
  description: "Add a new recipe to your cookbook collection",
};

export default function AddRecipePage() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />

      <main className="flex-1 container py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal mb-2">
            Add a Recipe
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
            Import from a website, paste text, or create from scratch.
          </p>

          <Tabs defaultValue="url" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-butter/50 h-auto">
              <TabsTrigger
                value="url"
                className="data-[state=active]:bg-warm-white text-xs sm:text-sm py-2"
              >
                From URL
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="data-[state=active]:bg-warm-white text-xs sm:text-sm py-2"
              >
                Paste Text
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-warm-white text-xs sm:text-sm py-2"
              >
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url">
              <UrlImportForm />
            </TabsContent>

            <TabsContent value="text">
              <TextImportForm />
            </TabsContent>

            <TabsContent value="manual">
              <ManualRecipeForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
