import type {
  Recipe as PrismaRecipe,
  Ingredient as PrismaIngredient,
  Instruction as PrismaInstruction,
  Tag as PrismaTag,
  RecipeImage as PrismaRecipeImage,
  Difficulty,
  Course,
  SourceType
} from "@prisma/client";

// Re-export Prisma types
export type { Difficulty, Course, SourceType };

// Base types from Prisma
export type Recipe = PrismaRecipe;
export type Ingredient = PrismaIngredient;
export type Instruction = PrismaInstruction;
export type Tag = PrismaTag;
export type RecipeImage = PrismaRecipeImage;

// Extended recipe with relations
export interface RecipeWithRelations extends Omit<Recipe, 'embedding'> {
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: Tag[];
  images: RecipeImage[];
}

// Input types for creating/updating
export interface IngredientInput {
  quantity?: string;
  unit?: string;
  name: string;
  notes?: string;
  group?: string;
  sortOrder?: number;
}

export interface InstructionInput {
  stepNumber: number;
  text: string;
  duration?: number;
  imageUrl?: string;
}

export interface RecipeInput {
  title: string;
  description?: string;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: string;
  difficulty?: Difficulty;
  cuisine?: string;
  course?: Course;
  tags?: string[];
  sourceUrl?: string;
  sourceType: SourceType;
  imageUrl?: string;
  notes?: string;
  rating?: number;
}

// Search types
export interface SearchFilters {
  cuisine?: string[];
  course?: Course[];
  difficulty?: Difficulty[];
  maxTime?: number;
  tags?: string[];
  isFavorite?: boolean;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  recipe: RecipeWithRelations;
  score: number;
  highlights?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  suggestedFilters?: string[];
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Import types
export interface UrlImportRequest {
  url: string;
}

export interface TextImportRequest {
  text: string;
}

export interface ParsedRecipe {
  title: string;
  description?: string;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: string;
  difficulty?: Difficulty;
  cuisine?: string;
  course?: Course;
  imageUrl?: string;
}

// Filter options for UI
export interface FilterOptions {
  cuisines: { value: string; count: number }[];
  courses: { value: Course; count: number }[];
  difficulties: { value: Difficulty; count: number }[];
  tags: { value: string; slug: string; count: number }[];
  maxTotalTime: number;
}
