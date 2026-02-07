import Link from "next/link";
import { hybridSearch } from "@/lib/search";
import { Badge } from "@/components/ui/badge";
import { RecipeImage } from "@/components/ui/recipe-image";
import { ContentEmptyState } from "@/components/ui/content-state";
import type { SearchResult } from "@/types/recipe";

interface SearchResultsProps {
  query: string;
}

export async function SearchResults({ query }: SearchResultsProps) {
  let results: SearchResult[] = [];
  let total = 0;

  try {
    const searchResult = await hybridSearch(query, {}, 20, 0);
    results = searchResult.results;
    total = searchResult.total;
  } catch (error) {
    console.error("Search error:", error);
  }

  if (results.length === 0) {
    return (
      <ContentEmptyState
        icon="🍽️"
        title="No recipes found"
        description="Try different keywords or add some recipes to your collection."
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-muted-foreground text-xs sm:text-sm">
        Found {total} recipe{total !== 1 ? "s" : ""}
      </p>

      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {results.map(({ recipe, score, highlights }) => (
          <Link
            key={recipe.id}
            href={`/recipe/${recipe.slug}`}
            className="bg-card flex gap-2.5 rounded-lg p-2.5 shadow-sm transition-shadow active:shadow-md sm:gap-3 sm:p-3 md:gap-4 md:p-4 md:hover:shadow-md"
          >
            {/* Thumbnail */}
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md sm:h-20 sm:w-24 md:h-24 md:w-32">
              <RecipeImage
                src={recipe.imageUrl}
                alt={recipe.title}
                sizes="(max-width: 640px) 64px, (max-width: 768px) 96px, 128px"
                fallbackEmoji="🍽️"
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                <h3 className="text-foreground line-clamp-2 font-serif text-sm font-semibold sm:line-clamp-1 sm:text-base md:text-lg">
                  {recipe.title}
                </h3>
                {score > 0.5 && (
                  <Badge
                    variant="secondary"
                    className="hidden shrink-0 text-xs sm:inline-flex"
                  >
                    {Math.round(score * 100)}% match
                  </Badge>
                )}
              </div>

              {recipe.description && (
                <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs sm:mt-1 sm:line-clamp-2 sm:text-sm">
                  {recipe.description}
                </p>
              )}

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-[10px] sm:mt-1.5 sm:gap-1.5 sm:text-xs md:mt-2 md:gap-2">
                {recipe.totalTime && (
                  <span className="flex items-center gap-0.5">
                    ⏱️ {recipe.totalTime} min
                  </span>
                )}
                {recipe.cuisine && <span>• {recipe.cuisine}</span>}
                {recipe.difficulty && (
                  <span className="hidden sm:inline">
                    • {recipe.difficulty.toLowerCase()}
                  </span>
                )}
                {recipe.isFavorite && <span>❤️</span>}
              </div>

              {/* Highlights */}
              {highlights && highlights.length > 0 && (
                <div className="text-muted-foreground mt-1.5 hidden text-xs sm:mt-2 md:block">
                  {highlights.slice(0, 2).map((h, i) => (
                    <p key={i} className="line-clamp-1">
                      ...{h}...
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
