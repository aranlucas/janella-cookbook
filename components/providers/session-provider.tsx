"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ShoppingListItem, SessionState } from "@/lib/session-store";
import { getSessionState, setSessionState } from "@/lib/session-store";
import type { SessionContextValue } from "@/components/providers/session-context";
import { SessionContext } from "@/components/providers/session-context";

// ---------------------------------------------------------------------------
// External store for sessionStorage — lets React re-render on changes
// ---------------------------------------------------------------------------

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function emitChange() {
  for (const l of listeners) {
    l();
  }
}

function getSnapshot(): SessionState {
  return getSessionState();
}

const serverSnapshot: SessionState = { shoppingList: [] };

function getServerSnapshot(): SessionState {
  return serverSnapshot;
}

function updateStore(updater: (prev: SessionState) => SessionState) {
  const next = updater(getSessionState());
  setSessionState(next);
  emitChange();
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let idCounter = 0;

function nextId() {
  return `sl_${Date.now()}_${++idCounter}`;
}

interface SessionProviderProps {
  readonly children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addToShoppingList = useCallback(
    (items: readonly Omit<ShoppingListItem, "id" | "checked" | "addedAt">[]) => {
      updateStore((prev) => ({
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
    updateStore((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.filter((i) => i.id !== id),
    }));
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    updateStore((prev) => ({
      ...prev,
      shoppingList: prev.shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
    }));
  }, []);

  const clearShoppingList = useCallback(() => {
    updateStore((prev) => ({ ...prev, shoppingList: [] }));
  }, []);

  const clearCheckedItems = useCallback(() => {
    updateStore((prev) => ({
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
