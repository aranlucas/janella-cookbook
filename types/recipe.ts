import type {
  Recipe as PrismaRecipe,
  Ingredient as PrismaIngredient,
  Instruction as PrismaInstruction,
  Tag as PrismaTag,
  RecipeImage as PrismaRecipeImage,
  Difficulty,
  Course,
  SourceType,
} from "@prisma/client";

export type { Difficulty, Course, SourceType };

export type Recipe = Readonly<PrismaRecipe>;

export type Ingredient = Readonly<PrismaIngredient>;

export type Instruction = Readonly<PrismaInstruction>;

export type Tag = Readonly<PrismaTag>;

export type RecipeImage = Readonly<PrismaRecipeImage>;

export interface RecipeWithRelations extends Omit<Recipe, "embedding" | "saveKey"> {
  readonly ingredients: readonly Ingredient[];
  readonly instructions: readonly Instruction[];
  readonly tags: readonly Tag[];
  readonly images: readonly RecipeImage[];
}

export interface IngredientInput {
  readonly quantity?: string;
  readonly unit?: string;
  readonly name: string;
  readonly notes?: string;
  readonly group?: string;
  readonly sortOrder?: number;
}

export interface InstructionInput {
  readonly text: string;
  readonly group?: string;
  readonly sortOrder?: number;
  readonly duration?: number;
  readonly imageUrl?: string;
}

export interface RecipeInput {
  readonly title: string;
  readonly description?: string;
  readonly ingredients: readonly IngredientInput[];
  readonly instructions: readonly InstructionInput[];
  readonly prepTime?: number;
  readonly cookTime?: number;
  readonly totalTime?: number;
  readonly servings?: string;
  readonly difficulty?: Difficulty;
  readonly cuisine?: string;
  readonly course?: Course;
  readonly tags?: readonly string[];
  readonly sourceUrl?: string;
  readonly sourceType: SourceType;
  readonly imageUrl?: string;
  readonly notes?: string;
  readonly rating?: number;
}

export interface SearchFilters {
  readonly cuisine?: readonly string[];
  readonly course?: readonly Course[];
  readonly difficulty?: readonly Difficulty[];
  readonly maxTime?: number;
  readonly tags?: readonly string[];
  readonly isFavorite?: boolean;
}

export interface SearchResult {
  readonly recipe: RecipeWithRelations;
  readonly score: number;
  readonly highlights?: readonly string[];
}

export interface ParsedRecipe {
  readonly title: string;
  readonly description?: string;
  readonly ingredients: readonly IngredientInput[];
  readonly instructions: readonly InstructionInput[];
  readonly prepTime?: number;
  readonly cookTime?: number;
  readonly totalTime?: number;
  readonly servings?: string;
  readonly difficulty?: Difficulty;
  readonly cuisine?: string;
  readonly course?: Course;
  readonly imageUrl?: string;
}

export interface FilterOptions {
  readonly cuisines: readonly { value: string; count: number }[];
  readonly courses: readonly { value: Course; count: number }[];
  readonly difficulties: readonly { value: Difficulty; count: number }[];
  readonly tags: readonly { value: string; slug: string; count: number }[];
  readonly maxTotalTime: number;
}
