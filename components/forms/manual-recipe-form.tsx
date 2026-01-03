"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
  RecipeWithRelations,
  RecipeInput,
  IngredientInput,
  InstructionInput,
  Difficulty,
  Course,
} from "@/types/recipe";

interface ManualRecipeFormProps {
  initialData?: RecipeWithRelations;
  onSuccess?: (recipe: RecipeWithRelations) => void;
}

const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD", "EXPERT"];
const courses: Course[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "APPETIZER",
  "SIDE",
  "DESSERT",
  "SNACK",
  "DRINK",
  "SAUCE",
  "BREAD",
];

export function ManualRecipeForm({
  initialData,
  onSuccess,
}: ManualRecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [prepTime, setPrepTime] = useState(
    initialData?.prepTime?.toString() || "",
  );
  const [cookTime, setCookTime] = useState(
    initialData?.cookTime?.toString() || "",
  );
  const [servings, setServings] = useState(initialData?.servings || "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(
    initialData?.difficulty || "",
  );
  const [cuisine, setCuisine] = useState(initialData?.cuisine || "");
  const [course, setCourse] = useState<Course | "">(initialData?.course || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [tags, setTags] = useState(
    initialData?.tags?.map((t) => t.name).join(", ") || "",
  );

  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    initialData?.ingredients?.map((i) => ({
      quantity: i.quantity || "",
      unit: i.unit || "",
      name: i.name,
      notes: i.notes || "",
      group: i.group || "",
    })) || [{ quantity: "", unit: "", name: "", notes: "", group: "" }],
  );

  const [instructions, setInstructions] = useState<InstructionInput[]>(
    initialData?.instructions?.map((i) => ({
      stepNumber: i.stepNumber,
      text: i.text,
      duration: i.duration || undefined,
    })) || [{ stepNumber: 1, text: "" }],
  );

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { quantity: "", unit: "", name: "", notes: "", group: "" },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof IngredientInput,
    value: string,
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      { stepNumber: instructions.length + 1, text: "" },
    ]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      const updated = instructions.filter((_, i) => i !== index);
      // Renumber steps
      setInstructions(
        updated.map((inst, i) => ({ ...inst, stepNumber: i + 1 })),
      );
    }
  };

  const updateInstruction = (index: number, text: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], text };
    setInstructions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a recipe title");
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    const validInstructions = instructions.filter((i) => i.text.trim());
    if (validInstructions.length === 0) {
      toast.error("Please add at least one instruction");
      return;
    }

    setIsLoading(true);

    const recipeData: RecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      prepTime: prepTime ? parseInt(prepTime, 10) : undefined,
      cookTime: cookTime ? parseInt(cookTime, 10) : undefined,
      servings: servings.trim() || undefined,
      difficulty: difficulty || undefined,
      cuisine: cuisine.trim() || undefined,
      course: course || undefined,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: validIngredients.map((i, idx) => ({
        ...i,
        sortOrder: idx,
      })),
      instructions: validInstructions.map((i, idx) => ({
        ...i,
        stepNumber: idx + 1,
      })),
      sourceType: "MANUAL",
    };

    try {
      const url = isEditing ? `/api/recipes/${initialData.id}` : "/api/recipes";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${isEditing ? "update" : "create"} recipe`,
        );
      }

      toast.success(
        `Recipe ${isEditing ? "updated" : "created"} successfully!`,
      );

      if (onSuccess) {
        onSuccess(data.data);
      } else {
        router.push(`/recipe/${data.data.slug}`);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to ${isEditing ? "update" : "create"} recipe`;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-warm-white">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">Basic Info</h3>

            <div className="space-y-2">
              <Label htmlFor="title">Recipe Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grandma's Chocolate Chip Cookies"
                className="bg-cream border-butter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this recipe..."
                className="bg-cream border-butter"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTime">Prep Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  min="0"
                  className="bg-cream border-butter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cookTime">Cook Time (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  min="0"
                  className="bg-cream border-butter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="e.g., 4-6"
                  className="bg-cream border-butter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as Difficulty)}
                >
                  <SelectTrigger className="bg-cream border-butter">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cuisine">Cuisine</Label>
                <Input
                  id="cuisine"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="e.g., Italian, Mexican"
                  className="bg-cream border-butter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select
                  value={course}
                  onValueChange={(v) => setCourse(v as Course)}
                >
                  <SelectTrigger className="bg-cream border-butter">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">
                Ingredients *
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
              >
                + Add Ingredient
              </Button>
            </div>

            <div className="space-y-4">
              {ingredients.map((ing, index) => (
                <div
                  key={index}
                  className="space-y-2 p-3 rounded-lg border border-butter bg-cream/30"
                >
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input
                        value={ing.quantity || ""}
                        onChange={(e) =>
                          updateIngredient(index, "quantity", e.target.value)
                        }
                        placeholder="Qty"
                        className="bg-cream border-butter"
                      />
                      <Input
                        value={ing.unit || ""}
                        onChange={(e) =>
                          updateIngredient(index, "unit", e.target.value)
                        }
                        placeholder="Unit"
                        className="bg-cream border-butter"
                      />
                      <Input
                        value={ing.name}
                        onChange={(e) =>
                          updateIngredient(index, "name", e.target.value)
                        }
                        placeholder="Ingredient name"
                        className="col-span-2 sm:col-span-2 bg-cream border-butter"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      disabled={ingredients.length === 1}
                    >
                      ✕
                    </Button>
                  </div>
                  <Input
                    value={ing.notes || ""}
                    onChange={(e) =>
                      updateIngredient(index, "notes", e.target.value)
                    }
                    placeholder="Notes (optional)"
                    className="bg-cream border-butter"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">
                Instructions *
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInstruction}
              >
                + Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {instructions.map((inst, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-butter font-serif font-bold">
                    {index + 1}
                  </div>
                  <Textarea
                    value={inst.text}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Step ${index + 1}...`}
                    className="flex-1 min-h-[80px] bg-cream border-butter"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction(index)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={instructions.length === 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">
              Additional Info
            </h3>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-cream border-butter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., comfort food, family favorite, quick"
                className="bg-cream border-butter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Personal Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any personal notes or modifications..."
                className="bg-cream border-butter"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-terracotta hover:bg-rust text-warm-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Update Recipe"
            ) : (
              "Create Recipe"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
