"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createRecipe, updateRecipe } from "@/lib/actions";
import { recipeInputSchema, type RecipeInputSchema } from "@/lib/validations";
import type {
  RecipeWithRelations,
  Difficulty,
  Course,
  ParsedRecipe,
  IngredientInput,
  InstructionInput,
  RecipeInput,
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

// Helper to read and clear import draft from sessionStorage (only runs on client)
function getImportDraft(): ParsedRecipe | null {
  if (typeof window === "undefined") return null;
  try {
    const draft = sessionStorage.getItem("importedRecipeDraft");
    if (!draft) return null;
    const parsed = JSON.parse(draft) as ParsedRecipe;
    sessionStorage.removeItem("importedRecipeDraft");
    return parsed;
  } catch {
    return null;
  }
}

export function ManualRecipeForm({
  initialData,
  onSuccess,
}: ManualRecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();

  // Get import draft once on initial render (only when not editing)
  const importDraft = !initialData ? getImportDraft() : null;

  const form = useForm<RecipeInputSchema>({
    resolver: zodResolver(recipeInputSchema),
    defaultValues: {
      title: initialData?.title || importDraft?.title || "",
      description: initialData?.description || importDraft?.description || "",
      prepTime: initialData?.prepTime || importDraft?.prepTime || undefined,
      cookTime: initialData?.cookTime || importDraft?.cookTime || undefined,
      servings: initialData?.servings || importDraft?.servings || "",
      difficulty: initialData?.difficulty || undefined,
      cuisine: initialData?.cuisine || importDraft?.cuisine || "",
      course:
        (initialData?.course as Course) ||
        (importDraft?.course as Course) ||
        undefined,
      imageUrl: initialData?.imageUrl || importDraft?.imageUrl || "",
      notes: initialData?.notes || "",
      tags: initialData?.tags?.map((t) => t.name) || [],
      ingredients: initialData?.ingredients?.length
        ? initialData.ingredients.map((i) => ({
            quantity: i.quantity || "",
            unit: i.unit || "",
            name: i.name,
            notes: i.notes || "",
            group: i.group || "",
          }))
        : importDraft?.ingredients?.length
          ? importDraft.ingredients.map((i: IngredientInput) => ({
              quantity: i.quantity || "",
              unit: i.unit || "",
              name: i.name || "",
              notes: i.notes || "",
              group: i.group || "",
            }))
          : [{ quantity: "", unit: "", name: "", notes: "", group: "" }],
      instructions: initialData?.instructions?.length
        ? initialData.instructions.map((i) => ({
            text: i.text,
            group: i.group || "",
            duration: i.duration || undefined,
          }))
        : importDraft?.instructions?.length
          ? importDraft.instructions.map((inst: InstructionInput) => ({
              text: inst.text || "",
              group: inst.group || "",
              duration: inst.duration || undefined,
            }))
          : [{ text: "", group: "" }],
      sourceType: initialData?.sourceType || "MANUAL",
    },
  });

  const { handleSubmit, register } = form;

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
  } = useFieldArray({
    control: form.control,
    name: "instructions",
  });

  const onSubmit = async (data: RecipeInputSchema) => {
    // Add sortOrder to ingredients and instructions
    const recipeData: RecipeInputSchema = {
      ...data,
      ingredients: data.ingredients.map((ing, idx) => ({
        ...ing,
        sortOrder: idx,
      })),
      instructions: data.instructions.map((inst, idx) => ({
        ...inst,
        sortOrder: idx,
      })),
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateRecipe(
            initialData.id,
            recipeData as unknown as Partial<RecipeInput>,
          )
        : await createRecipe(recipeData as unknown as RecipeInput);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Recipe ${isEditing ? "updated" : "created"} successfully!`,
      );

      if (onSuccess) {
        onSuccess(result.data as RecipeWithRelations);
      } else {
        const slug = result.slug || (result.data as RecipeWithRelations).slug;
        router.push(`/recipe/${slug}`);
      }
    });
  };

  const difficultyValue = useWatch({
    control: form.control,
    name: "difficulty",
  });
  const courseValue = useWatch({ control: form.control, name: "course" });
  const tagsValue = useWatch({ control: form.control, name: "tags" });
  const submitLabel = isEditing ? "Update Recipe" : "Create Recipe";

  return (
    <Card className="bg-card">
      <CardContent className="pt-6 pb-28 md:pb-6">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-semibold">Basic Info</h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Grandma's Chocolate Chip Cookies"
                        className="border-border bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="A brief description of this recipe..."
                        className="border-border bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Prep Time (min)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    {...register("prepTime", { valueAsNumber: true })}
                    min="0"
                    className="border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookTime">Cook Time (min)</Label>
                  <Input
                    id="cookTime"
                    type="number"
                    {...register("cookTime", { valueAsNumber: true })}
                    min="0"
                    className="border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    {...register("servings")}
                    placeholder="e.g., 4-6"
                    className="border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={difficultyValue}
                    onValueChange={(v) =>
                      form.setValue("difficulty", v as Difficulty)
                    }
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue>
                        {difficultyValue
                          ? difficultyValue.charAt(0) +
                            difficultyValue.slice(1).toLowerCase()
                          : "Select..."}
                      </SelectValue>
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
                    {...register("cuisine")}
                    placeholder="e.g., Italian, Mexican"
                    className="border-border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Select
                    value={courseValue}
                    onValueChange={(v) => form.setValue("course", v as Course)}
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue>
                        {courseValue
                          ? courseValue.charAt(0) +
                            courseValue.slice(1).toLowerCase()
                          : "Select..."}
                      </SelectValue>
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
                  onClick={() =>
                    appendIngredient({
                      quantity: "",
                      unit: "",
                      name: "",
                      notes: "",
                      group: "",
                    })
                  }
                >
                  + Add Ingredient
                </Button>
              </div>

              <div className="space-y-4">
                {ingredientFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg border border-border bg-background/30 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                        <Input
                          {...register(`ingredients.${index}.quantity`)}
                          placeholder="Qty"
                          className="border-border bg-background"
                        />
                        <Input
                          {...register(`ingredients.${index}.unit`)}
                          placeholder="Unit"
                          className="border-border bg-background"
                        />
                        <div className="col-span-2 space-y-1 sm:col-span-2">
                          <Input
                            {...register(`ingredients.${index}.name`)}
                            placeholder="Ingredient name"
                            className="border-border bg-background"
                          />
                          {form.formState.errors.ingredients?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {
                                form.formState.errors.ingredients[index].name
                                  .message
                              }
                            </p>
                          )}
                        </div>
                        <Input
                          {...register(`ingredients.${index}.group`)}
                          placeholder="Group (e.g., Green Salsa)"
                          className="border-border bg-background"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={ingredientFields.length === 1}
                        aria-label={`Remove ingredient ${index + 1}`}
                      >
                        ✕
                      </Button>
                    </div>
                    <Input
                      {...register(`ingredients.${index}.notes`)}
                      placeholder="Notes (optional)"
                      className="border-border bg-background"
                    />
                  </div>
                ))}
                {form.formState.errors.ingredients?.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.ingredients.root.message}
                  </p>
                )}
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
                  onClick={() => appendInstruction({ text: "", group: "" })}
                >
                  + Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {instructionFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg border border-border bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-serif text-sm font-bold">
                        {index + 1}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={instructionFields.length === 1}
                        aria-label={`Remove step ${index + 1}`}
                      >
                        ✕
                      </Button>
                    </div>
                    <Textarea
                      {...register(`instructions.${index}.text`)}
                      placeholder={`Step ${index + 1}...`}
                      className="min-h-[120px] border-border bg-background sm:min-h-[96px]"
                    />
                    <Input
                      {...register(`instructions.${index}.group`)}
                      placeholder="Step group (optional)"
                      className="border-border bg-background"
                    />
                    {form.formState.errors.instructions?.[index]?.text && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.instructions[index].text.message}
                      </p>
                    )}
                  </div>
                ))}
                {form.formState.errors.instructions?.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.instructions.root.message}
                  </p>
                )}
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
                  {...register("imageUrl")}
                  placeholder="https://example.com/image.jpg"
                  className="border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tagsValue?.join(", ")}
                  onChange={(e) =>
                    form.setValue(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="e.g., comfort food, family favorite, quick"
                  className="border-border bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Personal Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any personal notes or modifications..."
                  className="border-border bg-background"
                />
              </div>
            </div>

            <div className="hidden md:block">
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="mr-2 animate-spin">⏳</span>
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="mr-2 animate-spin">⏳</span>
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
