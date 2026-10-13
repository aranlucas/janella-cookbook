import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Difficulty, Course } from "@/types/recipe";

const starSlots = ["star-1", "star-2", "star-3", "star-4", "star-5"];

function formatCourse(course: Course) {
  return course.charAt(0) + course.slice(1).toLowerCase();
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
  const difficultyColor = {
    EASY: "bg-accent text-primary-foreground",
    MEDIUM: "bg-muted text-foreground",
    HARD: "bg-primary text-primary-foreground",
    EXPERT: "bg-destructive text-destructive-foreground",
  };

  const hasPositiveRatingOrCookCount =
    (rating !== undefined && rating !== null && rating > 0) ||
    (cookCount !== undefined && cookCount > 0);

  return (
    <div className={cn("flex flex-col gap-3 md:gap-4", className)}>
      {/* Time info */}
      <div className="flex flex-wrap gap-3 text-xs sm:gap-4 sm:text-sm">
        {prepTime && (
          <div className="group/meta flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block transition-transform duration-300 group-hover/meta:scale-125">
              🔪
            </span>
            <span className="text-muted-foreground/95">Prep:</span>
            <span className="font-medium">{prepTime} min</span>
          </div>
        )}
        {cookTime && (
          <div className="group/meta flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block transition-transform duration-300 group-hover/meta:scale-125">
              🔥
            </span>
            <span className="text-muted-foreground/95">Cook:</span>
            <span className="font-medium">{cookTime} min</span>
          </div>
        )}
        {totalTime && (
          <div className="group/meta flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block transition-transform duration-300 group-hover/meta:rotate-360">
              ⏱️
            </span>
            <span className="text-muted-foreground/95">Total:</span>
            <span className="font-medium">{totalTime} min</span>
          </div>
        )}
        {servings && (
          <div className="group/meta flex items-center gap-1.5 sm:gap-2">
            <span className="inline-block transition-transform duration-300 group-hover/meta:scale-125">
              🍽️
            </span>
            <span className="text-muted-foreground/95">Servings:</span>
            <span className="font-medium">{servings}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {difficulty && (
          <Badge className={cn(difficultyColor[difficulty])}>
            {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
          </Badge>
        )}
        {cuisine && <Badge variant="outline">{cuisine}</Badge>}
        {course && <Badge variant="secondary">{formatCourse(course)}</Badge>}
      </div>
      {/* Rating and cook count (only show positive values) */}
      {hasPositiveRatingOrCookCount && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {rating !== undefined && rating !== null && rating > 0 && (
            <div className="flex items-center gap-1">
              {starSlots.map((slot, i) => (
                <span key={slot} className={i < rating ? "text-primary" : "text-muted-foreground"}>
                  ★
                </span>
              ))}
            </div>
          )}
          {cookCount !== undefined && cookCount > 0 && (
            <span>
              Cooked {cookCount} time{cookCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
