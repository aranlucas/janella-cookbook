"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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
import { z } from "zod";
import { createRecipe, updateRecipe } from "@/lib/actions";
import { recipeInputSchema, recipeDraftSchema, type RecipeInputSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import type {
  RecipeWithRelations,
  Difficulty,
  Course,
  IngredientInput,
  InstructionInput,
  RecipeInput,
} from "@/types/recipe";

type RecipeSubmissionInput = Readonly<
  Omit<RecipeInputSchema, "tags" | "ingredients" | "instructions">
> & {
  readonly tags?: readonly string[];
  readonly ingredients: readonly Readonly<RecipeInputSchema["ingredients"][number]>[];
  readonly instructions: readonly Readonly<RecipeInputSchema["instructions"][number]>[];
};

interface ManualRecipeFormProps {
  readonly initialData?: RecipeWithRelations;
  readonly draft?: RecipeInputSchema;
  readonly draftKey?: string;
  readonly onSuccess?: (recipe: RecipeWithRelations) => void;
}

type FormSection = "basic" | "ingredients" | "instructions" | "additional";

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

function parseIngredientLine(line: string): IngredientInput | null {
  const [mainPart, notesPart, groupPart] = line.split("|").map((part) => part.trim());

  if (!mainPart) {
    return null;
  }

  let quantity = "";
  let unit = "";
  let name = mainPart;

  const quantityMatch = mainPart.match(/^([\d¼½¾⅓⅔⅛⅜⅝⅞/.-]+)\s+(.+)$/);

  if (quantityMatch) {
    quantity = quantityMatch[1] ?? "";
    const remainder = quantityMatch[2] ?? "";

    const unitMatch = remainder.match(
      /^(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|kg|ml|l|oz|lb|lbs|pounds?|ounces?|cloves?|pinch)\s+(.+)$/i,
    );

    if (unitMatch && (unitMatch[1]?.length ?? 0) <= 14) {
      unit = unitMatch[1] ?? "";
      name = unitMatch[2] ?? remainder;
    } else {
      name = remainder;
    }
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    return null;
  }

  return {
    quantity,
    unit,
    name: normalizedName,
    notes: notesPart || "",
    group: groupPart || "",
  };
}

export function ManualRecipeForm({
  initialData,
  draft,
  draftKey = "manual",
  onSuccess,
}: Readonly<ManualRecipeFormProps>) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();

  const [sectionOpen, setSectionOpen] = useState<Record<FormSection, boolean>>({
    basic: true,
    ingredients: true,
    instructions: true,
    additional: false,
  });

  const [bulkIngredients, setBulkIngredients] = useState("");
  const [bulkInstructions, setBulkInstructions] = useState("");

  // Get import draft once on initial render (only when not editing)
  const importDraft = draft;
  const storageKey = `recipe-draft:${draft ? draftKey : (initialData?.id ?? draftKey)}`;
  const saveKey = useRef("");
  const saved = useRef(false);

  const expectedUpdatedAt = useRef(
    initialData ? new Date(initialData.updatedAt).toISOString() : undefined,
  );

  const [saveError, setSaveError] = useState("");

  const form = useForm<RecipeInputSchema>({
    resolver: zodResolver(recipeInputSchema),
    defaultValues: {
      title: initialData?.title ?? importDraft?.title ?? "",
      description: initialData?.description ?? importDraft?.description ?? "",
      prepTime: initialData?.prepTime ?? importDraft?.prepTime ?? undefined,
      cookTime: initialData?.cookTime ?? importDraft?.cookTime ?? undefined,
      servings: initialData?.servings ?? importDraft?.servings ?? "",
      difficulty: initialData?.difficulty ?? undefined,
      cuisine: initialData?.cuisine ?? importDraft?.cuisine ?? "",
      // SAFETY: stored recipes use the Prisma Course enum and importDraft is validated by recipeInputSchema.
      course: (initialData?.course as Course) || importDraft?.course || undefined,
      imageUrl: initialData?.imageUrl ?? importDraft?.imageUrl ?? "",
      notes: initialData?.notes ?? "",
      tags: initialData?.tags?.map((t) => t.name) ?? [],
      ingredients: initialData?.ingredients?.length
        ? initialData.ingredients.map((i) => ({
            quantity: i.quantity ?? "",
            unit: i.unit ?? "",
            name: i.name,
            notes: i.notes ?? "",
            group: i.group ?? "",
          }))
        : importDraft?.ingredients?.length
          ? importDraft.ingredients.map((i: IngredientInput) => ({
              quantity: i.quantity ?? "",
              unit: i.unit ?? "",
              name: i.name || "",
              notes: i.notes ?? "",
              group: i.group ?? "",
            }))
          : [{ quantity: "", unit: "", name: "", notes: "", group: "" }],
      instructions: initialData?.instructions?.length
        ? initialData.instructions.map((i) => ({
            text: i.text,
            group: i.group ?? "",
            duration: i.duration ?? undefined,
          }))
        : importDraft?.instructions?.length
          ? importDraft.instructions.map((inst: InstructionInput) => ({
              text: inst.text || "",
              group: inst.group ?? "",
              duration: inst.duration ?? undefined,
            }))
          : [{ text: "", group: "" }],
      sourceType: initialData?.sourceType ?? "MANUAL",
      sourceUrl: initialData?.sourceUrl ?? "",
      ...draft,
    },
  });

  const { handleSubmit, register } = form;
  useEffect(() => {
    saveKey.current = crypto.randomUUID();

    try {
      const raw = localStorage.getItem(storageKey);

      if (raw) {
        const stored = z
          .object({
            values: z.unknown().optional(),
            expectedUpdatedAt: z.string().optional(),
            saveKey: z.string().optional(),
          })
          .safeParse(JSON.parse(raw));

        if (stored.success) {
          const parsed = recipeDraftSchema.safeParse(stored.data.values);

          if (parsed.success) {
            form.reset(parsed.data);
          }

          if (stored.data.expectedUpdatedAt) {
            expectedUpdatedAt.current = stored.data.expectedUpdatedAt;
          }

          if (stored.data.saveKey) {
            saveKey.current = stored.data.saveKey;
          }
        }
      }
    } catch {
      /* The editor also works without local storage. */
    }

    const persistDraft = () => {
      if (saved.current) {
        return;
      }

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            values: form.getValues(),
            saveKey: saveKey.current,
            expectedUpdatedAt: expectedUpdatedAt.current,
          }),
        );
      } catch {
        /* Keep the in-memory draft. */
      }
    };

    persistDraft();

    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => persistDraft(),
    });

    return unsubscribe;
  }, [form, storageKey]);

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

  const toggleSection = (section: FormSection) => {
    setSectionOpen((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleBulkIngredientAdd = () => {
    const parsed = bulkIngredients
      .split("\n")
      .map((line) => parseIngredientLine(line.trim()))
      .filter((item): item is IngredientInput => item !== null);

    if (parsed.length === 0) {
      return;
    }

    if (ingredientFields.length === 1 && !form.getValues("ingredients.0.name").trim()) {
      removeIngredient(0);
    }

    for (const ingredient of parsed) {
      appendIngredient({
        quantity: ingredient.quantity ?? "",
        unit: ingredient.unit ?? "",
        name: ingredient.name,
        notes: ingredient.notes ?? "",
        group: ingredient.group ?? "",
      });
    }

    setBulkIngredients("");
    toast.success(`Added ${parsed.length} ingredient${parsed.length === 1 ? "" : "s"}`);
  };

  const handleBulkInstructionAdd = () => {
    const parsed = bulkInstructions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      return;
    }

    if (instructionFields.length === 1 && !form.getValues("instructions.0.text").trim()) {
      removeInstruction(0);
    }

    for (const text of parsed) {
      appendInstruction({ text, group: "" });
    }

    setBulkInstructions("");
    toast.success(`Added ${parsed.length} step${parsed.length === 1 ? "" : "s"}`);
  };

  const onSubmit = (data: RecipeSubmissionInput) => {
    // Add sortOrder to ingredients and instructions
    const recipeData: RecipeInput = {
      ...data,
      prepTime: data.prepTime ?? undefined,
      cookTime: data.cookTime ?? undefined,
      totalTime: data.totalTime ?? undefined,
      rating: data.rating ?? undefined,
      tags: data.tags ? [...data.tags] : undefined,
      ingredients: data.ingredients.map((ing, idx) => ({
        ...ing,
        sortOrder: idx,
      })),
      instructions: data.instructions.map((inst, idx) => ({
        ...inst,
        sortOrder: idx,
      })),
    };

    setSaveError("");
    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateRecipe(initialData.id, recipeData, expectedUpdatedAt.current)
          : await createRecipe(recipeData, saveKey.current);

        if (!result.success) {
          setSaveError(result.error);
          toast.error(result.error);

          return;
        }

        saved.current = true;

        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* Storage is optional. */
        }

        toast.success(`Recipe ${isEditing ? "updated" : "created"} successfully!`);

        if (onSuccess) {
          onSuccess(result.data);
        } else {
          const slug = result.slug ?? result.data.slug;
          router.push(`/recipe/${slug}`);
          router.refresh();
        }
      } catch {
        setSaveError("The save could not be confirmed. Retry safely; your draft is still here.");
      }
    });
  };

  const difficultyValue = useWatch({
    control: form.control,
    name: "difficulty",
  });

  const courseValue = useWatch({ control: form.control, name: "course" });
  const tagsValue = useWatch({ control: form.control, name: "tags" }) ?? [];
  const submitLabel = isEditing ? "Update Recipe" : "Save recipe";
  const isDirty = form.formState.isDirty;

  const handleInvalid = () => {
    setSectionOpen({
      basic: true,
      ingredients: true,
      instructions: true,
      additional: true,
    });
    setSaveError("Check the highlighted fields before saving.");
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>(
        '[aria-invalid="true"], input[name="title"]',
      );

      first?.focus();
      first?.scrollIntoView({ block: "center" });
    });
  };

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={(event) => void handleSubmit(onSubmit, handleInvalid)(event)}
          className="flex flex-col gap-8"
        >
          {saveError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              {saveError}
            </p>
          )}
          <fieldset disabled={isPending} className="contents">
            {/* Basic Info */}
            <section className="flex flex-col gap-4 border-bs border-border/70 pbs-5 first:border-bs-0 first:pbs-0">
              <button
                type="button"
                onClick={() => toggleSection("basic")}
                className="flex w-full items-center justify-between text-start"
              >
                <h3 className="font-display text-2xl font-semibold">Basic Info</h3>
                <span className="text-sm text-muted-foreground">
                  {sectionOpen.basic ? "Hide" : "Show"}
                </span>
              </button>

              {sectionOpen.basic && (
                <div className="flex flex-col gap-4">
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="prepTime">Prep Time (min)</Label>
                      <Input
                        id="prepTime"
                        type="number"
                        {...register("prepTime", {
                          setValueAs: (value: string) => (value === "" ? undefined : Number(value)),
                        })}
                        min="0"
                        className="border-border bg-background"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="cookTime">Cook Time (min)</Label>
                      <Input
                        id="cookTime"
                        type="number"
                        {...register("cookTime", {
                          setValueAs: (value: string) => (value === "" ? undefined : Number(value)),
                        })}
                        min="0"
                        className="border-border bg-background"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="servings">Servings</Label>
                      <Input
                        id="servings"
                        {...register("servings")}
                        placeholder="e.g., 4-6"
                        className="border-border bg-background"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={difficultyValue}
                        onValueChange={(v) => {
                          // SAFETY: Select emits only the Difficulty values rendered from difficulties below.
                          form.setValue("difficulty", v as Difficulty, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="border-border bg-background">
                          <SelectValue>
                            {difficultyValue
                              ? difficultyValue.charAt(0) + difficultyValue.slice(1).toLowerCase()
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="cuisine">Cuisine</Label>
                      <Input
                        id="cuisine"
                        {...register("cuisine")}
                        placeholder="e.g., Italian, Mexican"
                        className="border-border bg-background"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="course">Course</Label>
                      <Select
                        value={courseValue}
                        onValueChange={(v) => {
                          // SAFETY: Select emits only the Course values rendered from courses below.
                          form.setValue("course", v as Course, { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="border-border bg-background">
                          <SelectValue>
                            {courseValue
                              ? courseValue.charAt(0) + courseValue.slice(1).toLowerCase()
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
              )}
            </section>

            {/* Ingredients */}
            <section className="flex flex-col gap-4 border-bs border-border/70 pbs-5 first:border-bs-0 first:pbs-0">
              <button
                type="button"
                onClick={() => toggleSection("ingredients")}
                className="flex w-full items-center justify-between text-start"
              >
                <h3 className="font-display text-2xl font-semibold">
                  Ingredients * ({ingredientFields.length})
                </h3>
                <span className="text-sm text-muted-foreground">
                  {sectionOpen.ingredients ? "Hide" : "Show"}
                </span>
              </button>

              {sectionOpen.ingredients && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSectionOpen((current) => ({
                          ...current,
                          ingredients: false,
                        }))
                      }
                    >
                      Collapse Section
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-dashed border-foreground/20 p-4">
                    <Label htmlFor="bulkIngredients" className="text-sm">
                      Bulk add (one ingredient per line)
                    </Label>
                    <Textarea
                      id="bulkIngredients"
                      value={bulkIngredients}
                      onChange={(event) => setBulkIngredients(event.target.value)}
                      placeholder={
                        "1 cup sugar\n2 tbsp olive oil | optional\n1 lb chicken thighs | trim fat | Marinade"
                      }
                      className="mbs-2 min-h-24 border-border bg-background"
                    />
                    <div className="mbs-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Use &quot;|&quot; separators for optional notes and group.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBulkIngredientAdd}
                        disabled={!bulkIngredients.trim()}
                      >
                        Add Lines
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {ingredientFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex flex-col gap-2 rounded-2xl bg-card p-3 sm:p-4"
                      >
                        <div className="flex items-start gap-2">
                          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                            <Input
                              {...register(`ingredients.${index}.quantity`)}
                              aria-label={`Ingredient ${index + 1} quantity`}
                              placeholder="Qty"
                              className="border-border bg-background"
                            />
                            <Input
                              {...register(`ingredients.${index}.unit`)}
                              aria-label={`Ingredient ${index + 1} unit`}
                              placeholder="Unit"
                              className="border-border bg-background"
                            />
                            <div className="col-span-2 flex flex-col gap-1">
                              <Input
                                {...register(`ingredients.${index}.name`)}
                                aria-label={`Ingredient ${index + 1} name`}
                                placeholder="Ingredient name"
                                className="border-border bg-background"
                              />
                              {form.formState.errors.ingredients?.[index]?.name && (
                                <p className="text-xs text-destructive">
                                  {form.formState.errors.ingredients[index].name.message}
                                </p>
                              )}
                            </div>
                            <Input
                              {...register(`ingredients.${index}.group`)}
                              aria-label={`Ingredient ${index + 1} group`}
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
                          aria-label={`Ingredient ${index + 1} notes`}
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
                </>
              )}
            </section>

            {/* Instructions */}
            <section className="flex flex-col gap-4 border-bs border-border/70 pbs-5 first:border-bs-0 first:pbs-0">
              <button
                type="button"
                onClick={() => toggleSection("instructions")}
                className="flex w-full items-center justify-between text-start"
              >
                <h3 className="font-display text-2xl font-semibold">
                  Instructions * ({instructionFields.length})
                </h3>
                <span className="text-sm text-muted-foreground">
                  {sectionOpen.instructions ? "Hide" : "Show"}
                </span>
              </button>

              {sectionOpen.instructions && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendInstruction({ text: "", group: "" })}
                    >
                      + Add Step
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSectionOpen((current) => ({
                          ...current,
                          instructions: false,
                        }))
                      }
                    >
                      Collapse Section
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-dashed border-foreground/20 p-4">
                    <Label htmlFor="bulkInstructions" className="text-sm">
                      Bulk add steps (one step per line)
                    </Label>
                    <Textarea
                      id="bulkInstructions"
                      value={bulkInstructions}
                      onChange={(event) => setBulkInstructions(event.target.value)}
                      placeholder={
                        "Preheat oven to 375°F\nMix dry ingredients\nBake for 25 minutes"
                      }
                      className="mbs-2 min-h-24 border-border bg-background"
                    />
                    <div className="mbs-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBulkInstructionAdd}
                        disabled={!bulkInstructions.trim()}
                      >
                        Add Steps
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {instructionFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex flex-col gap-2 rounded-2xl bg-card p-3 sm:p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-serif text-sm font-bold">
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
                          aria-label={`Step ${index + 1} text`}
                          placeholder={`Step ${index + 1}...`}
                          className="min-h-30 border-border bg-background sm:min-h-24"
                        />
                        <Input
                          {...register(`instructions.${index}.group`)}
                          aria-label={`Step ${index + 1} group`}
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
                </>
              )}
            </section>

            {/* Additional Info */}
            <section className="flex flex-col gap-4 border-bs border-border/70 pbs-5 first:border-bs-0 first:pbs-0">
              <button
                type="button"
                onClick={() => toggleSection("additional")}
                className="flex w-full items-center justify-between text-start"
              >
                <h3 className="font-display text-2xl font-semibold">Additional Info</h3>
                <span className="text-sm text-muted-foreground">
                  {sectionOpen.additional ? "Hide" : "Show"}
                </span>
              </button>

              {sectionOpen.additional && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      {...register("imageUrl")}
                      placeholder="https://example.com/image.jpg"
                      className="border-border bg-background"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={tagsValue.join(", ")}
                      onChange={(e) =>
                        form.setValue(
                          "tags",
                          e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                          { shouldDirty: true },
                        )
                      }
                      placeholder="e.g., comfort food, family favorite, quick"
                      className="border-border bg-background"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Personal Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any personal notes or modifications..."
                      className="border-border bg-background"
                    />
                  </div>
                </div>
              )}
            </section>
          </fieldset>
          <div className="sticky inset-be-0 z-40 -mx-4 border-bs border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
            <div className="flex w-full items-center justify-between gap-3">
              <p className={cn("text-sm", isDirty ? "text-foreground" : "text-muted-foreground")}>
                {isPending
                  ? "Saving changes..."
                  : isDirty
                    ? "Unsaved changes"
                    : isEditing
                      ? "No new changes"
                      : "Ready to save"}
              </p>
              <Button type="submit" size="lg" className="px-5" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
