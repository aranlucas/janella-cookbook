import Link from "next/link";
import { Star } from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";
import type { Difficulty, Course } from "@/types/recipe";

const starSlots = ["star-1", "star-2", "star-3", "star-4", "star-5"];

function capitalize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

interface Fact {
  readonly label: string;
  readonly value: string;
}

interface RecipeMetaProps {
  readonly prepTime?: number | null;
  readonly cookTime?: number | null;
  readonly totalTime?: number | null;
  readonly servings?: string | null;
  readonly difficulty?: Difficulty | null;
  readonly cuisine?: string | null;
  readonly course?: Course | null;
  readonly rating?: number | null;
  readonly cookCount?: number;
  readonly className?: string;
}

export function RecipeMeta({
  prepTime,
  cookTime,
  totalTime,
  servings,
  difficulty,
  cuisine,
  course,
  rating,
  cookCount,
  className,
}: RecipeMetaProps) {
  const facts = [
    { label: "Prep", value: prepTime ? formatMinutes(prepTime) : null },
    { label: "Cook", value: cookTime ? formatMinutes(cookTime) : null },
    { label: "Total", value: totalTime ? formatMinutes(totalTime) : null },
    { label: "Makes", value: servings?.trim() ? servings.trim() : null },
  ].filter((fact): fact is Fact => fact.value !== null);

  const hasRating = rating !== undefined && rating !== null && rating > 0;
  const hasCookCount = cookCount !== undefined && cookCount > 0;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border/80 py-3 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="font-display text-xl leading-tight font-semibold sm:text-2xl">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {difficulty && (
          <span>
            <span className="font-medium text-foreground">{capitalize(difficulty)}</span> to make
          </span>
        )}
        {course && (
          <Link
            href={`/recipes?category=${course.toLowerCase()}`}
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
          >
            {capitalize(course)}
          </Link>
        )}
        {cuisine && (
          <Link
            href={`/recipes?category=${encodeURIComponent(cuisine.toLowerCase())}`}
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
          >
            {cuisine}
          </Link>
        )}
        {hasRating && (
          <span className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
            {starSlots.map((slot, i) => (
              <Star
                key={slot}
                aria-hidden="true"
                className={cn(
                  "size-4",
                  i < rating ? "fill-highlight text-highlight" : "text-muted-foreground/50",
                )}
              />
            ))}
          </span>
        )}
        {hasCookCount && (
          <span>
            Cooked {cookCount} {cookCount === 1 ? "time" : "times"}
          </span>
        )}
      </div>
    </div>
  );
}
