"use client";

import { useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RecipeWithRelations } from "@/types/recipe";

interface NutritionFactsProps {
  readonly recipe: RecipeWithRelations;
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Nutrition</h2>
        {!hasGenerated && !isLoading && (
          <Button
            onClick={() => void handleGenerate()}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            Generate with AI
          </Button>
        )}
        {hasGenerated && !isLoading && (
          <Button
            onClick={() => void handleGenerate()}
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
          <Spinner className="size-6" />
          <span className="ms-2 text-sm text-muted-foreground">Analyzing nutrition...</span>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          Failed to generate nutrition facts. Please try again.
        </div>
      )}

      {completion && (
        <div className="rounded-3xl bg-card p-5 md:p-6">
          <div className="max-w-none overflow-x-auto text-foreground">
            <Streamdown mode="streaming">{completion}</Streamdown>
          </div>
          <p className="mbs-4 border-bs pbs-4 text-xs text-muted-foreground">
            <strong>Note:</strong> Nutritional information is AI-generated and approximate. For
            precise values, consult a registered dietitian or use a nutrition calculator.
          </p>
        </div>
      )}

      {!hasGenerated && !isLoading && !completion && (
        <p className="text-base text-muted-foreground">
          Get an AI estimate of calories, protein, carbs, and fat per serving.
        </p>
      )}
    </div>
  );
}
