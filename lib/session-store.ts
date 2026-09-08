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

let cachedRaw: string | null = null;
let cachedState = DEFAULT_STATE;
let memoryOnly = false;

function read(): SessionState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  if (memoryOnly) return cachedState;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw === cachedRaw) return cachedState;
    const parsed: unknown = raw ? JSON.parse(raw) : DEFAULT_STATE;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("shoppingList" in parsed) ||
      !Array.isArray(parsed.shoppingList)
    )
      return DEFAULT_STATE;
    cachedRaw = raw;
    cachedState = parsed as SessionState;
    return cachedState;
  } catch {
    return cachedState;
  }
}

function write(state: SessionState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    memoryOnly = true; // Keep working in memory if storage is unavailable.
  }
}

export function getSessionState(): SessionState {
  return read();
}

export function setSessionState(state: SessionState): void {
  cachedState = state;
  cachedRaw = JSON.stringify(state);
  write(state);
}

export type { SessionState };
