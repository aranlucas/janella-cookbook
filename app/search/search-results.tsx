import Link from "next/link";
import { hybridSearch } from "@/lib/search";
import { Badge } from "@/components/ui/badge";
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
      <div className="py-16 text-center">
        <span className="mb-4 block text-6xl">🍽️</span>
        <h2 className="mb-2 font-serif text-xl font-semibold">
          No recipes found
        </h2>
        <p className="text-muted-foreground">
          Try different keywords or add some recipes to your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Found {total} recipe{total !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3 sm:space-y-4">
        {results.map(({ recipe, score, highlights }) => (
          <Link
            key={recipe.id}
            href={`/recipe/${recipe.slug}`}
            className="bg-warm-white flex gap-3 rounded-lg p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4"
          >
            {/* Thumbnail */}
            <div className="bg-butter/30 relative h-16 w-20 shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-32">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-2xl opacity-30 sm:text-3xl">🍽️</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-charcoal line-clamp-2 font-serif text-base font-semibold sm:line-clamp-1 sm:text-lg">
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
                <p className="text-muted-foreground mt-1 line-clamp-2 hidden text-xs sm:block sm:text-sm">
                  {recipe.description}
                </p>
              )}

              <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 text-xs sm:mt-2 sm:gap-2">
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
                <div className="text-muted-foreground mt-1.5 hidden text-xs sm:mt-2 sm:block">
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
