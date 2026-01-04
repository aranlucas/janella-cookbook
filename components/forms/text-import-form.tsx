"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { RecipeWithRelations } from "@/types/recipe";

interface TextImportFormProps {
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

export function TextImportForm({ onSuccess }: TextImportFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("Please enter some recipe text");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/import/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse recipe");
      }

      toast.success("Recipe parsed successfully!");

      if (onSuccess) {
        onSuccess(data.data);
      } else {
        router.push(`/recipe/${data.data.slug}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse recipe";
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
            <Label htmlFor="text">Recipe Text</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste your recipe here. For example:

Grandma's Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups flour
- 1 cup butter, softened
- 3/4 cup sugar
- 2 eggs
- 1 tsp vanilla
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix butter and sugar until fluffy
3. Add eggs and vanilla
4. Gradually add flour
5. Fold in chocolate chips
6. Bake for 9-11 minutes`}
              className="bg-cream border-butter focus:border-terracotta min-h-[300px]"
              disabled={isLoading}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="text-muted-foreground text-sm">
            <p>
              Paste any recipe text - from a cookbook, email, or anywhere else.
              We&apos;ll use AI to extract and organize it automatically.
            </p>
          </div>

          <Button
            type="submit"
            className="bg-terracotta hover:bg-rust text-warm-white w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Parsing...
              </>
            ) : (
              "Parse Recipe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
