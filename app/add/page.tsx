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
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="container flex-1 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-charcoal mb-2 font-serif text-2xl font-bold sm:text-3xl">
            Add a Recipe
          </h1>
          <p className="text-muted-foreground mb-6 text-sm sm:mb-8 sm:text-base">
            Import from a website, paste text, or create from scratch.
          </p>

          <Tabs defaultValue="url" className="space-y-4 sm:space-y-6">
            <TabsList className="bg-butter/50 grid h-auto w-full grid-cols-3">
              <TabsTrigger
                value="url"
                className="data-[state=active]:bg-warm-white py-2 text-xs sm:text-sm"
              >
                From URL
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="data-[state=active]:bg-warm-white py-2 text-xs sm:text-sm"
              >
                Paste Text
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-warm-white py-2 text-xs sm:text-sm"
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
