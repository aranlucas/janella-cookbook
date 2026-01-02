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

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl font-bold text-charcoal mb-2">
            Add a Recipe
          </h1>
          <p className="text-muted-foreground mb-8">
            Import from a website, paste text, or create from scratch.
          </p>

          <Tabs defaultValue="url" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-butter/50">
              <TabsTrigger value="url" className="data-[state=active]:bg-warm-white">
                From URL
              </TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-warm-white">
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-warm-white">
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
