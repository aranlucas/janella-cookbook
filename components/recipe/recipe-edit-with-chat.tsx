"use client";

import { ManualRecipeForm } from "@/components/forms/manual-recipe-form";
import { RecipeChatAssistant } from "@/components/recipe/recipe-chat-assistant";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeEditWithChatProps {
  recipe: RecipeWithRelations;
}

export function RecipeEditWithChat({ recipe }: RecipeEditWithChatProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Recipe Form */}
      <div className="lg:order-1">
        <ManualRecipeForm initialData={recipe} />
      </div>

      {/* AI Chat Assistant */}
      <div className="lg:sticky lg:top-4 lg:order-2 lg:self-start">
        <RecipeChatAssistant recipe={recipe} />
      </div>
    </div>
  );
}
