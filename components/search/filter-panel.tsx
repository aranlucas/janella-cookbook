"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type {
  FilterOptions,
  SearchFilters,
  Difficulty,
  Course,
} from "@/types/recipe";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  options: FilterOptions;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  className?: string;
}

export function FilterPanel({
  options,
  filters,
  onChange,
  className,
}: FilterPanelProps) {
  const toggleArrayFilter = <T extends string>(
    key: keyof SearchFilters,
    value: T,
  ) => {
    const current = (filters[key] as T[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters =
    (filters.cuisine?.length || 0) > 0 ||
    (filters.course?.length || 0) > 0 ||
    (filters.difficulty?.length || 0) > 0 ||
    filters.maxTime !== undefined ||
    filters.isFavorite !== undefined;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      {/* Favorites */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Filters</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="favorites"
            checked={filters.isFavorite === true}
            onCheckedChange={(checked) =>
              onChange({ ...filters, isFavorite: checked ? true : undefined })
            }
          />
          <label htmlFor="favorites" className="text-sm cursor-pointer">
            Favorites only
          </label>
        </div>
      </div>

      <Separator />

      {/* Time */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Max Time: {filters.maxTime || options.maxTotalTime} min
        </Label>
        <Slider
          value={[filters.maxTime || options.maxTotalTime]}
          onValueChange={([value]) =>
            onChange({
              ...filters,
              maxTime: value < options.maxTotalTime ? value : undefined,
            })
          }
          max={options.maxTotalTime}
          min={5}
          step={5}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Difficulty */}
      {options.difficulties.length > 0 && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Difficulty</Label>
            <div className="space-y-2">
              {options.difficulties.map((d) => (
                <div key={d.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diff-${d.value}`}
                    checked={filters.difficulty?.includes(d.value) || false}
                    onCheckedChange={() =>
                      toggleArrayFilter<Difficulty>("difficulty", d.value)
                    }
                  />
                  <label
                    htmlFor={`diff-${d.value}`}
                    className="text-sm cursor-pointer capitalize"
                  >
                    {d.value.toLowerCase()} ({d.count})
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Course */}
      {options.courses.length > 0 && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Course</Label>
            <div className="space-y-2">
              {options.courses.map((c) => (
                <div key={c.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`course-${c.value}`}
                    checked={filters.course?.includes(c.value) || false}
                    onCheckedChange={() =>
                      toggleArrayFilter<Course>("course", c.value)
                    }
                  />
                  <label
                    htmlFor={`course-${c.value}`}
                    className="text-sm cursor-pointer capitalize"
                  >
                    {c.value.toLowerCase()} ({c.count})
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Cuisine */}
      {options.cuisines.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cuisine</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {options.cuisines.map((c) => (
              <div key={c.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`cuisine-${c.value}`}
                  checked={filters.cuisine?.includes(c.value) || false}
                  onCheckedChange={() =>
                    toggleArrayFilter<string>("cuisine", c.value)
                  }
                />
                <label
                  htmlFor={`cuisine-${c.value}`}
                  className="text-sm cursor-pointer"
                >
                  {c.value} ({c.count})
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
