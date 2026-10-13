"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { FilterOptions, SearchFilters, Difficulty, Course } from "@/types/recipe";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface FilterPanelProps {
  readonly options: FilterOptions;
  readonly filters: SearchFilters;
  readonly onChange: (filters: SearchFilters) => void;
  readonly className?: string;
}

export function FilterPanel({ options, filters, onChange, className }: Readonly<FilterPanelProps>) {
  const toggleArrayFilter = <T extends string>(key: keyof SearchFilters, value: T) => {
    const filterValue = filters[key];
    const parsedCurrent = z.array(z.string()).safeParse(filterValue);
    const current = parsedCurrent.success ? parsedCurrent.data : [];

    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onChange({ ...filters, [key]: updated.length > 0 ? updated : undefined });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters =
    (filters.cuisine?.length ?? 0) > 0 ||
    (filters.course?.length ?? 0) > 0 ||
    (filters.difficulty?.length ?? 0) > 0 ||
    filters.maxTime !== undefined ||
    filters.isFavorite !== undefined;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
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
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Quick Filters</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="favorites"
            checked={filters.isFavorite === true}
            onCheckedChange={(checked) =>
              onChange({ ...filters, isFavorite: checked ? true : undefined })
            }
          />
          <label htmlFor="favorites" className="cursor-pointer text-sm">
            Favorites only
          </label>
        </div>
      </div>

      <Separator />

      {/* Time */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">
          Max Time: {filters.maxTime ?? options.maxTotalTime} min
        </Label>
        <Slider
          value={[filters.maxTime ?? options.maxTotalTime]}
          onValueChange={(values: number | readonly number[]) => {
            const parsedValues = z.array(z.number()).safeParse(values);
            const singleValue = z.number().safeParse(values);
            const value = parsedValues.success ? parsedValues.data[0] : singleValue.data;

            if (value === undefined) {
              return;
            }

            onChange({
              ...filters,
              maxTime: value < options.maxTotalTime ? value : undefined,
            });
          }}
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
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Difficulty</Label>
            <div className="flex flex-col gap-2">
              {options.difficulties.map((d) => (
                <div key={d.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`diff-${d.value}`}
                    checked={filters.difficulty?.includes(d.value) ?? false}
                    onCheckedChange={() => toggleArrayFilter<Difficulty>("difficulty", d.value)}
                  />
                  <label htmlFor={`diff-${d.value}`} className="cursor-pointer text-sm capitalize">
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
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Course</Label>
            <div className="flex flex-col gap-2">
              {options.courses.map((c) => (
                <div key={c.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`course-${c.value}`}
                    checked={filters.course?.includes(c.value) ?? false}
                    onCheckedChange={() => toggleArrayFilter<Course>("course", c.value)}
                  />
                  <label
                    htmlFor={`course-${c.value}`}
                    className="cursor-pointer text-sm capitalize"
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
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">Cuisine</Label>
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {options.cuisines.map((c) => (
              <div key={c.value} className="flex items-center gap-2">
                <Checkbox
                  id={`cuisine-${c.value}`}
                  checked={filters.cuisine?.includes(c.value) ?? false}
                  onCheckedChange={() => toggleArrayFilter<string>("cuisine", c.value)}
                />
                <label htmlFor={`cuisine-${c.value}`} className="cursor-pointer text-sm">
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
