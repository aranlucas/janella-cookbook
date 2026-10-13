"use client";

import { z } from "zod";

/**
 * Generic session-scoped store backed by sessionStorage.
 * Data persists across page navigations but clears when the tab closes.
 */

const STORE_KEY = "janella_session_store";

export const shoppingListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  recipeTitle: z.string().optional(),
  recipeSlug: z.string().optional(),
  checked: z.boolean(),
  addedAt: z.number(),
});

export type ShoppingListItem = Readonly<z.infer<typeof shoppingListItemSchema>>;

const sessionStateSchema = z.object({
  shoppingList: z.array(shoppingListItemSchema),
});

export type SessionState = {
  readonly shoppingList: readonly ShoppingListItem[];
};

const DEFAULT_STATE: SessionState = {
  shoppingList: [],
};

let cachedRaw: string | null = null;

let cachedState = DEFAULT_STATE;

let memoryOnly = false;

function read(): SessionState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  if (memoryOnly) {
    return cachedState;
  }

  try {
    const raw = sessionStorage.getItem(STORE_KEY);

    if (raw === cachedRaw) {
      return cachedState;
    }

    const parsed: unknown = raw ? JSON.parse(raw) : DEFAULT_STATE;

    const result = sessionStateSchema.safeParse(parsed);

    if (!result.success) {
      return DEFAULT_STATE;
    }

    cachedRaw = raw;
    cachedState = result.data;

    return cachedState;
  } catch {
    return cachedState;
  }
}

function write(state: SessionState): void {
  if (typeof window === "undefined") {
    return;
  }

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
