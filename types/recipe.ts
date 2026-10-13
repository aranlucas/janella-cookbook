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

// Re-export Prisma types
export type { Difficulty, Course, SourceType };

// Base types from Prisma
export type Recipe = Readonly<PrismaRecipe>;

export type Ingredient = Readonly<PrismaIngredient>;

export type Instruction = Readonly<PrismaInstruction>;

export type Tag = Readonly<PrismaTag>;

export type RecipeImage = Readonly<PrismaRecipeImage>;

// Extended recipe with relations
export interface RecipeWithRelations extends Omit<Recipe, "embedding" | "saveKey"> {
  readonly ingredients: readonly Ingredient[];
  readonly instructions: readonly Instruction[];
  readonly tags: readonly Tag[];
  readonly images: readonly RecipeImage[];
}

// Input types for creating/updating
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

// Search types
export interface SearchFilters {
  readonly cuisine?: readonly string[];
  readonly course?: readonly Course[];
  readonly difficulty?: readonly Difficulty[];
  readonly maxTime?: number;
  readonly tags?: readonly string[];
  readonly isFavorite?: boolean;
}

export interface SearchRequest {
  readonly query: string;
  readonly filters?: SearchFilters;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchResult {
  readonly recipe: RecipeWithRelations;
  readonly score: number;
  readonly highlights?: readonly string[];
}

export interface SearchResponse {
  readonly results: readonly SearchResult[];
  readonly total: number;
  readonly query: string;
  readonly suggestedFilters?: readonly string[];
}

// API response types
export interface ApiResponse<T> {
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

// Import types
export interface UrlImportRequest {
  readonly url: string;
}

export interface TextImportRequest {
  text: string;
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

// Filter options for UI
export interface FilterOptions {
  readonly cuisines: readonly { value: string; count: number }[];
  readonly courses: readonly { value: Course; count: number }[];
  readonly difficulties: readonly { value: Difficulty; count: number }[];
  readonly tags: readonly { value: string; slug: string; count: number }[];
  readonly maxTotalTime: number;
}
