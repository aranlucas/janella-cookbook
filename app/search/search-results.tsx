import Link from "next/link";
import Image from "next/image";
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
      <div className="text-center py-16">
        <span className="text-6xl mb-4 block">🍽️</span>
        <h2 className="font-serif text-xl font-semibold mb-2">
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
      <p className="text-sm text-muted-foreground">
        Found {total} recipe{total !== 1 ? "s" : ""}
      </p>

      <div className="space-y-4">
        {results.map(({ recipe, score, highlights }) => (
          <Link
            key={recipe.id}
            href={`/recipe/${recipe.slug}`}
            className="flex gap-4 p-4 bg-warm-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Thumbnail */}
            <div className="relative w-32 h-24 shrink-0 rounded-md overflow-hidden bg-butter/30">
              {recipe.imageUrl ? (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-3xl opacity-30">🍽️</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg font-semibold text-charcoal line-clamp-1">
                  {recipe.title}
                </h3>
                {score > 0.5 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {Math.round(score * 100)}% match
                  </Badge>
                )}
              </div>

              {recipe.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {recipe.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                {recipe.totalTime && (
                  <span>⏱️ {recipe.totalTime} min</span>
                )}
                {recipe.cuisine && (
                  <span>• {recipe.cuisine}</span>
                )}
                {recipe.difficulty && (
                  <span>• {recipe.difficulty.toLowerCase()}</span>
                )}
                {recipe.isFavorite && (
                  <span>❤️</span>
                )}
              </div>

              {/* Highlights */}
              {highlights && highlights.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
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
