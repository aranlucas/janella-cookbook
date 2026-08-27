"use client";

import { ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useShoppingList } from "@/components/providers/session-provider";

export function ShoppingListDrawer() {
  const { items, toggle, remove, clear, clearChecked, count } =
    useShoppingList();

  const checkedCount = items.filter((i) => i.checked).length;

  // Group items by recipe
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.recipeTitle || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        aria-label="Shopping list"
      >
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif text-lg">
            <ShoppingCart className="h-5 w-5" />
            Shopping List
            {items.length > 0 && (
              <Badge variant="outline" className="ml-auto font-sans text-xs">
                {checkedCount}/{items.length}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Session-scoped — clears when you close this tab.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-30" />
            <p className="text-sm">Your shopping list is empty.</p>
            <p className="text-xs">Add ingredients from any recipe page.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4">
            {Object.entries(grouped).map(([recipeName, groupItems]) => (
              <div key={recipeName} className="mb-4">
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {recipeName}
                </h4>
                <ul className="space-y-1.5">
                  {groupItems.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        item.checked
                          ? "bg-muted/40 text-muted-foreground"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggle(item.id)}
                      />
                      <span
                        className={cn(
                          "flex-1 cursor-pointer select-none",
                          item.checked && "line-through opacity-60",
                        )}
                        onClick={() => toggle(item.id)}
                      >
                        {item.quantity && (
                          <span className="font-medium">{item.quantity} </span>
                        )}
                        {item.unit && (
                          <span className="text-muted-foreground">
                            {item.unit}{" "}
                          </span>
                        )}
                        {item.name}
                        {item.notes && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({item.notes})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => remove(item.id)}
                        className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-destructive"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t">
            <div className="flex w-full gap-2">
              {checkedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChecked}
                  className="flex-1"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear checked ({checkedCount})
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={clear}
                className="flex-1"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
