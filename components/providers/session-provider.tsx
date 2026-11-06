"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ShoppingListItem } from "@/lib/session-store";
import {
  getSessionState,
  getServerSessionState,
  subscribeSession,
  updateSessionState,
} from "@/lib/session-store";
import type { SessionContextValue } from "@/components/providers/session-context";
import { SessionContext } from "@/components/providers/session-context";

let idCounter = 0;

function nextId() {
  return `sl_${Date.now()}_${++idCounter}`;
}

interface SessionProviderProps {
  readonly children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const state = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);

  const addToShoppingList = useCallback(
    (items: readonly Omit<ShoppingListItem, "id" | "checked" | "addedAt">[]) => {
      updateSessionState((prev) => ({
        ...prev,
        shoppingList: [
          ...prev.shoppingList,
          ...items.map((item) => ({
            ...item,
            id: nextId(),
            checked: false,
            addedAt: Date.now(),
          })),
        ],
      }));
    },
    [],
  );

  const removeFromShoppingList = useCallback((id: string) => {
    updateSessionState((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((i) => i.id !== id),
    }));
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    updateSessionState((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
    }));
  }, []);

  const clearShoppingList = useCallback(() => {
    updateSessionState((prev) => ({ ...prev, shoppingList: [] }));
  }, []);

  const clearCheckedItems = useCallback(() => {
    updateSessionState((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((i) => !i.checked),
    }));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      shoppingList: state.shoppingList,
      addToShoppingList,
      removeFromShoppingList,
      toggleShoppingItem,
      clearShoppingList,
      clearCheckedItems,
      shoppingListCount: state.shoppingList.filter((i) => !i.checked).length,
    }),
    [
      state.shoppingList,
      addToShoppingList,
      removeFromShoppingList,
      toggleShoppingItem,
      clearShoppingList,
      clearCheckedItems,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
