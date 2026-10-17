import Link from "next/link";
import { Clock, Heart, UtensilsCrossed } from "lucide-react";
import { hybridSearch } from "@/lib/search";
import { RecipeImage } from "@/components/ui/recipe-image";
import { EmptyState } from "@/components/layout/page-state";
import type { SearchResult } from "@/types/recipe";
import { formatMinutes } from "@/lib/utils";

interface SearchResultsProps {
  readonly query: string;
}

/** Snippets worth showing: drop ones that just repeat the title or description */
function extraHighlights(
  highlights: readonly string[] | undefined,
  recipe: SearchResult["recipe"],
): string[] {
  const shown = `${recipe.title} ${recipe.description ?? ""}`.toLowerCase();

  return [...new Set(highlights ?? [])]
    .filter((highlight) => !shown.includes(highlight.trim().toLowerCase()))
    .slice(0, 2);
}

export async function SearchResults({ query }: SearchResultsProps) {
  let results: SearchResult[] = [];
  let total = 0;

  const searchResult = await hybridSearch(query, {}, 20, 0);

  if (searchResult.isOk()) {
    results = searchResult.value.results;
    total = searchResult.value.total;
  } else {
    console.error("Search error:", searchResult.error);
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No recipes found"
        description="Try different keywords or add some recipes to your collection."
      />
    );
  }

  return (
    <div>
      <p className="sr-only">
        Found {total} {total === 1 ? "recipe" : "recipes"}
      </p>
      <ol className="flex flex-col">
        {results.map(({ recipe, score, highlights }) => (
          <li key={recipe.id} className="border-be border-border/70 last:border-be-0">
            <Link href={`/recipe/${recipe.slug}`} className="group flex gap-4 py-4 sm:gap-6">
              <div className="relative aspect-4/3 w-28 shrink-0 overflow-hidden rounded-xl bg-card sm:w-44">
                {recipe.imageUrl ? (
                  <RecipeImage
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    sizes="(max-width: 640px) 112px, 176px"
                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center font-display text-4xl font-semibold text-primary/25"
                  >
                    {recipe.title.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="line-clamp-2 font-display text-lg leading-tight font-semibold transition-colors group-hover:text-primary sm:text-2xl">
                    {recipe.title}
                  </h2>
                  {score > 0.5 && (
                    <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                      {Math.round(score * 100)}% match
                    </span>
                  )}
                </div>

                {recipe.description && (
                  <p className="mbs-1 line-clamp-2 text-sm text-muted-foreground sm:text-base">
                    {recipe.description}
                  </p>
                )}

                <div className="mbs-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {recipe.totalTime ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {formatMinutes(recipe.totalTime)}
                    </span>
                  ) : null}
                  {recipe.cuisine && <span>{recipe.cuisine}</span>}
                  {recipe.isFavorite && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Heart className="size-3.5 fill-current" aria-hidden="true" />
                      Favorite
                    </span>
                  )}
                </div>

                {extraHighlights(highlights, recipe).length > 0 && (
                  <div className="mbs-2 hidden text-sm text-muted-foreground italic md:block">
                    {extraHighlights(highlights, recipe).map((highlight) => (
                      <p key={highlight} className="line-clamp-1">
                        …{highlight}…
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
