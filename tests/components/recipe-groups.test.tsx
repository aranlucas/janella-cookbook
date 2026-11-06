import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { IngredientList } from "@/components/recipe/ingredient-list";
import { InstructionSteps } from "@/components/recipe/instruction-steps";

afterEach(cleanup);

// Accepted recipe text must remain renderable even when it matches object property names.
test.each(["__proto__", "constructor", "toString"])("renders literal group %s", (group) => {
  render(
    <>
      <IngredientList
        ingredients={[
          {
            id: "ingredient",
            recipeId: "recipe",
            name: "Cardamom",
            group,
            sortOrder: 0,
            quantity: null,
            unit: null,
            notes: null,
          },
        ]}
      />
      <InstructionSteps
        instructions={[
          {
            id: "step",
            recipeId: "recipe",
            text: "Toast gently.",
            group,
            sortOrder: 0,
            duration: null,
            imageUrl: null,
          },
        ]}
      />
    </>,
  );
  expect(screen.getAllByRole("heading", { name: group })).toHaveLength(2);
  expect(screen.getByText("Cardamom")).toBeTruthy();
  expect(screen.getByText("Toast gently.")).toBeTruthy();
});
