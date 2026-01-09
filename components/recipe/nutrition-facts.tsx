"use client";

import { useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RecipeWithRelations } from "@/types/recipe";

interface NutritionFactsProps {
  recipe: RecipeWithRelations;
}

export function NutritionFacts({ recipe }: NutritionFactsProps) {
  const [hasGenerated, setHasGenerated] = useState(false);

  const { completion, isLoading, complete, error } = useCompletion({
    api: "/api/nutrition",
    onFinish: () => {
      setHasGenerated(true);
    },
  });

  const handleGenerate = async () => {
    await complete("", {
      body: {
        title: recipe.title,
        ingredients: recipe.ingredients,
        servings: recipe.servings,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold md:text-xl">
          Nutrition Facts
        </h3>
        {!hasGenerated && !isLoading && (
          <Button
            onClick={handleGenerate}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Generate with AI
          </Button>
        )}
        {hasGenerated && !isLoading && (
          <Button
            onClick={handleGenerate}
            variant="ghost"
            size="sm"
            className="text-sm"
          >
            Regenerate
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
          <span className="text-muted-foreground ml-2 text-sm">
            Analyzing nutrition...
          </span>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          Failed to generate nutrition facts. Please try again.
        </div>
      )}

      {completion && (
        <div className="bg-warm-white rounded-lg p-4 shadow-sm md:p-6">
          <div className="text-charcoal prose prose-sm max-w-none">
            <Streamdown mode="streaming">{completion}</Streamdown>
          </div>
          <p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
            <strong>Note:</strong> Nutritional information is AI-generated and
            approximate. For precise values, consult a registered dietitian or
            use a nutrition calculator.
          </p>
        </div>
      )}

      {!hasGenerated && !isLoading && !completion && (
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Click "Generate with AI" to get estimated nutritional information
            for this recipe.
          </p>
        </div>
      )}
    </div>
  );
}
