import type { Prisma } from "@prisma/client";
import { listRecipes } from "@/lib/recipe-queries";
import { hybridSearch } from "@/lib/search";
import { recipeCategorySchema, type RecipeCategoryFilter } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

export const RECIPES_PER_PAGE = 20;

export const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "A-Z" },
  { value: "quick", label: "Quickest" },
  { value: "favorites", label: "Favorites First" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export function isSortOption(value?: string): value is SortOption {
  return Boolean(SORT_OPTIONS.find((option) => option.value === value));
}

export interface RecipeBrowseRequest {
  readonly query?: string;
  readonly category?: string;
  readonly page: number;
  readonly sort: SortOption;
}

export interface RecipeBrowseResult {
  readonly recipes: readonly RecipeWithRelations[];
  readonly total: number;
}

const orderBySort: Readonly<
  Record<
    SortOption,
    Prisma.RecipeOrderByWithRelationInput | Prisma.RecipeOrderByWithRelationInput[]
  >
> = {
  recent: { updatedAt: "desc" },
  newest: { createdAt: "desc" },
  title: { title: "asc" },
  quick: { totalTime: "asc" },
  favorites: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
};

function sortRecipesInMemory(
  recipes: readonly RecipeWithRelations[],
  sort: SortOption,
): RecipeWithRelations[] {
  return [...recipes].toSorted((a, b) => {
    switch (sort) {
      case "recent":
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "quick":
        return (a.totalTime ?? Number.MAX_SAFE_INTEGER) - (b.totalTime ?? Number.MAX_SAFE_INTEGER);
      case "favorites":
        if (a.isFavorite === b.isFavorite) {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }

        return a.isFavorite ? -1 : 1;

      case "title": {
        return a.title.localeCompare(b.title);
      }

      default:
        return a.title.localeCompare(b.title);
    }
  });
}

// Free-text queries use hybrid relevance search; category links are structured
// course/cuisine filters so results and counts match the category index.
export async function browseRecipes({
  query,
  category,
  page,
  sort,
}: Readonly<RecipeBrowseRequest>): Promise<RecipeBrowseResult> {
  const offset = (page - 1) * RECIPES_PER_PAGE;

  try {
    if (query) {
      const searchResult = await hybridSearch(query, {}, RECIPES_PER_PAGE, offset);

      if (searchResult.isErr()) {
        console.error("Search error:", searchResult.error);

        return { recipes: [], total: 0 };
      }

      return {
        recipes: sortRecipesInMemory(
          searchResult.value.results.map((r) => r.recipe),
          sort,
        ),
        total: searchResult.value.total,
      };
    }

    let categoryFilter: RecipeCategoryFilter | undefined;

    if (category) {
      const parsed = recipeCategorySchema.safeParse(category);

      if (!parsed.success) {
        return { recipes: [], total: 0 };
      }

      categoryFilter = parsed.data;
    }

    return await listRecipes({
      ...categoryFilter,
      orderBy: orderBySort[sort],
      limit: RECIPES_PER_PAGE,
      offset,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);

    return { recipes: [], total: 0 };
  }
}
