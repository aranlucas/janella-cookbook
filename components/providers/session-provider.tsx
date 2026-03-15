"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ShoppingListItem, SessionState } from "@/lib/session-store";
import { getSessionState, setSessionState } from "@/lib/session-store";

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
  for (const l of listeners) l();
}

function getSnapshot(): SessionState {
  return getSessionState();
}

function getServerSnapshot(): SessionState {
  return { shoppingList: [] };
}

function updateStore(updater: (prev: SessionState) => SessionState) {
  const next = updater(getSessionState());
  setSessionState(next);
  emitChange();
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface SessionContextValue {
  shoppingList: ShoppingListItem[];
  addToShoppingList: (
    items: Omit<ShoppingListItem, "id" | "checked" | "addedAt">[],
  ) => void;
  removeFromShoppingList: (id: string) => void;
  toggleShoppingItem: (id: string) => void;
  clearShoppingList: () => void;
  clearCheckedItems: () => void;
  shoppingListCount: number;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId() {
  return `sl_${Date.now()}_${++idCounter}`;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addToShoppingList = useCallback(
    (items: Omit<ShoppingListItem, "id" | "checked" | "addedAt">[]) => {
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
      shoppingList: prev.shoppingList.map((i) =>
        i.id === id ? { ...i, checked: !i.checked } : i,
      ),
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

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

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
