import { z } from "zod";

const STORAGE_KEY = "janella_recent_searches";
const recentSearchesSchema = z.array(z.string());

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    return raw ? recentSearchesSchema.parse(JSON.parse(raw)) : [];
  } catch {
    // Storage may be disabled or contain data from a previous app version.
    return [];
  }
}

export function rememberSearch(query: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const next = [query, ...readRecentSearches().filter((item) => item !== query)].slice(0, 8);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Search navigation remains available when browser storage is disabled.
  }
}
