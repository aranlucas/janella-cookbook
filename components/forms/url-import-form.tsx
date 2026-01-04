"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { RecipeWithRelations } from "@/types/recipe";

interface UrlImportFormProps {
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

export function UrlImportForm({ onSuccess }: UrlImportFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import recipe");
      }

      toast.success("Recipe imported successfully!");

      if (onSuccess) {
        onSuccess(data.data);
      } else {
        router.push(`/recipe/${data.data.slug}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to import recipe";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-warm-white">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Recipe URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe/delicious-pasta"
              className="bg-cream border-butter focus:border-terracotta"
              disabled={isLoading}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="text-muted-foreground text-sm">
            <p>
              Paste a URL from your favorite recipe site. We&apos;ll
              automatically extract:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Recipe title and description</li>
              <li>Ingredients with quantities</li>
              <li>Step-by-step instructions</li>
              <li>Cooking times and servings</li>
              <li>Recipe image</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="bg-terracotta hover:bg-rust text-warm-white w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Importing...
              </>
            ) : (
              "Import Recipe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
