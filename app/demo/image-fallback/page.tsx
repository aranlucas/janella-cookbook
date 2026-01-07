import { AppLayout } from "@/components/layout/app-layout";
import { RecipeImage } from "@/components/ui/recipe-image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";

export const metadata = {
  title: "Image Fallback Demo | Cookbook",
  description: "Demonstration of the image fallback feature",
};

export default function ImageFallbackDemo() {
  // A valid placeholder image URL
  const fallbackImageUrl = "https://placehold.co/600x400/butter/charcoal?text=Fallback+Image";

  return (
    <AppLayout customContent>
      <div className="container py-8">
        <BreadcrumbNav
          container={false}
          items={[
            { label: "Home", href: "/" },
            { label: "Image Fallback Demo", active: true },
          ]}
        />

        <div className="mt-8 space-y-12">
          <div>
            <h1 className="font-serif text-4xl font-bold mb-4">
              Image Fallback Feature Demo
            </h1>
            <p className="text-muted-foreground text-lg">
              This page demonstrates the graceful image fallback handling in the RecipeImage component.
            </p>
          </div>

          {/* Example 1: Working Image */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                1. Working Image
              </h2>
              <p className="text-muted-foreground">
                A valid image URL loads successfully.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border">
              <RecipeImage
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                alt="Delicious salad"
                fallback={fallbackImageUrl}
              />
            </div>
          </section>

          {/* Example 2: Broken Image with Fallback */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                2. Broken Image → Fallback Image
              </h2>
              <p className="text-muted-foreground">
                When the primary image fails to load, the fallback image is automatically displayed.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border">
              <RecipeImage
                src="https://invalid-url-that-will-fail.example.com/image.jpg"
                alt="Recipe that fails to load"
                fallback={fallbackImageUrl}
              />
            </div>
          </section>

          {/* Example 3: Both Images Fail */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                3. Both Images Fail → Emoji Fallback
              </h2>
              <p className="text-muted-foreground">
                If both the primary and fallback images fail, an emoji placeholder is shown.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border">
              <RecipeImage
                src="https://invalid-url-1.example.com/image.jpg"
                alt="Recipe that fails to load"
                fallback="https://invalid-url-2.example.com/fallback.jpg"
                fallbackEmoji="🍕"
              />
            </div>
          </section>

          {/* Example 4: No Fallback Provided */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                4. No Fallback → Direct to Emoji
              </h2>
              <p className="text-muted-foreground">
                Without a fallback image URL, failed images go straight to the emoji placeholder.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border">
              <RecipeImage
                src="https://invalid-url.example.com/image.jpg"
                alt="Recipe that fails to load"
                fallbackEmoji="🥗"
              />
            </div>
          </section>

          {/* Example 5: Null/Undefined Source */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                5. No Source → Emoji Fallback
              </h2>
              <p className="text-muted-foreground">
                When no image source is provided, the emoji fallback is shown immediately.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-lg border">
              <RecipeImage
                src={null}
                alt="Recipe with no image"
                fallbackEmoji="🍰"
              />
            </div>
          </section>

          {/* New Simple Component Examples */}
          <section className="space-y-4 border-t pt-12">
            <div>
              <h2 className="font-serif text-3xl font-semibold mb-2">
                ImageWithFallback Component (Simple)
              </h2>
              <p className="text-muted-foreground">
                A minimal, clean implementation that follows the Vercel Solutions pattern exactly.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Working image */}
              <div className="space-y-2">
                <h3 className="font-semibold">Working Image</h3>
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop"
                    alt="Delicious salad"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Broken image with fallback */}
              <div className="space-y-2">
                <h3 className="font-semibold">Broken → Fallback</h3>
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
                  <ImageWithFallback
                    src="https://invalid-url.example.com/broken.jpg"
                    fallback="https://placehold.co/600x400/e8b4b8/4a4a4a?text=Fallback+Image"
                    alt="Broken image with fallback"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Usage Examples */}
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold mb-2">
                Usage
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">ImageWithFallback (Simple)</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`<ImageWithFallback
  src={recipe.imageUrl}
  alt={recipe.title}
  fallback="https://example.com/default.jpg"
  fill
  className="object-cover"
/>`}</code>
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">RecipeImage (Advanced)</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{`<RecipeImage
  src={recipe.imageUrl}
  alt={recipe.title}
  fallback="https://example.com/default-recipe.jpg"
  fallbackEmoji="🍽️"
  priority={true}
/>`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
