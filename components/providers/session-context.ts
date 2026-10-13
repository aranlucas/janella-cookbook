"use client";

import { createContext, useContext } from "react";
import type { ShoppingListItem } from "@/lib/session-store";

export interface SessionContextValue {
  readonly shoppingList: readonly ShoppingListItem[];
  readonly addToShoppingList: (
    items: readonly Omit<ShoppingListItem, "id" | "checked" | "addedAt">[],
  ) => void;
  readonly removeFromShoppingList: (id: string) => void;
  readonly toggleShoppingItem: (id: string) => void;
  readonly clearShoppingList: () => void;
  readonly clearCheckedItems: () => void;
  readonly shoppingListCount: number;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);

  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }

  return ctx;
}

export function useShoppingList() {
  const {
    shoppingList,
    addToShoppingList,
    removeFromShoppingList,
    toggleShoppingItem,
    clearShoppingList,
    clearCheckedItems,
    shoppingListCount,
  } = useSession();

  return {
    items: shoppingList,
    add: addToShoppingList,
    remove: removeFromShoppingList,
    toggle: toggleShoppingItem,
    clear: clearShoppingList,
    clearChecked: clearCheckedItems,
    count: shoppingListCount,
  };
}
