import { beforeEach, expect, test, vi } from "vitest";
import { readRecentSearches, rememberSearch } from "@/components/search/recent-searches";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
});

// Catch readers/writers drifting apart and unavailable storage blocking navigation.
test("recent searches share ordering, deduplication and storage recovery", () => {
  rememberSearch("soup");
  rememberSearch("toast");
  rememberSearch("soup");
  expect(readRecentSearches()).toEqual(["soup", "toast"]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  expect(readRecentSearches()).toEqual([]);
  expect(() => rememberSearch("salad")).not.toThrow();
});

// A write must notify React readers; storage failure must preserve shopping progress.
test("session updates notify subscribers and survive denied storage", async () => {
  const store = await import("@/lib/session-store");
  const listener = vi.fn();
  const unsubscribe = store.subscribeSession(listener);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  store.updateSessionState(() => ({
    shoppingList: [{ id: "one", name: "carrot", checked: false, addedAt: 1 }],
  }));
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getSessionState().shoppingList.map((item) => item.name)).toEqual(["carrot"]);
  unsubscribe();
  store.updateSessionState(() => ({ shoppingList: [] }));
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getSessionState().shoppingList).toEqual([]);
});
