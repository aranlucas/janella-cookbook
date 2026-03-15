"use client";

/**
 * Generic session-scoped store backed by sessionStorage.
 * Data persists across page navigations but clears when the tab closes.
 */

const STORE_KEY = "janella_session_store";

interface SessionState {
  shoppingList: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  recipeTitle?: string;
  recipeSlug?: string;
  checked: boolean;
  addedAt: number;
}

const DEFAULT_STATE: SessionState = {
  shoppingList: [],
};

function read(): SessionState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_STATE;
    return JSON.parse(raw) as SessionState;
  } catch {
    return DEFAULT_STATE;
  }
}

function write(state: SessionState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable — silently degrade
  }
}

export function getSessionState(): SessionState {
  return read();
}

export function setSessionState(state: SessionState): void {
  write(state);
}

export type { SessionState };
