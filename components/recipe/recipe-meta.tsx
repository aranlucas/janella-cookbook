import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Difficulty, Course } from "@/types/recipe";

interface RecipeMetaProps {
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  servings?: string | null;
  difficulty?: Difficulty | null;
  cuisine?: string | null;
  course?: Course | null;
  rating?: number | null;
  cookCount?: number;
  className?: string;
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
    EASY: "bg-sage text-warm-white",
    MEDIUM: "bg-butter text-charcoal",
    HARD: "bg-terracotta text-warm-white",
    EXPERT: "bg-rust text-warm-white",
  };

  const formatCourse = (c: Course) => {
    return c.charAt(0) + c.slice(1).toLowerCase();
  };

  return (
    <div className={cn("space-y-3 md:space-y-4", className)}>
      {/* Time info */}
      <div className="flex flex-wrap gap-3 text-xs sm:gap-4 sm:text-sm">
        {prepTime && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-muted-foreground">Prep:</span>
            <span className="font-medium">{prepTime} min</span>
          </div>
        )}
        {cookTime && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-muted-foreground">Cook:</span>
            <span className="font-medium">{cookTime} min</span>
          </div>
        )}
        {totalTime && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{totalTime} min</span>
          </div>
        )}
        {servings && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-muted-foreground">Servings:</span>
            <span className="font-medium">{servings}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {difficulty && (
          <Badge className={cn(difficultyColor[difficulty])}>
            {difficulty.toLowerCase()}
          </Badge>
        )}
        {cuisine && <Badge variant="outline">{cuisine}</Badge>}
        {course && <Badge variant="secondary">{formatCourse(course)}</Badge>}
      </div>

      {/* Rating and cook count */}
      {(rating || cookCount) && (
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          {rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < rating ? "text-terracotta" : "text-butter"}
                >
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
