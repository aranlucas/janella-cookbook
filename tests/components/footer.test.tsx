import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Footer } from "@/components/layout/footer";

test("footer exposes the main recipe and site navigation", () => {
  render(<Footer />);

  expect(screen.getByRole("heading", { name: "Explore" })).toBeDefined();
  expect(screen.getByRole("link", { name: "All Recipes" }).getAttribute("href")).toBe("/recipes");
  expect(screen.getByRole("link", { name: "About Janella" }).getAttribute("href")).toBe("/about");
});
