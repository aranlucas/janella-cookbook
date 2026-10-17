import Link from "next/link";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { ContentEmptyState } from "@/components/ui/content-state";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

function formatCategoryName(value: string): string {
  return value
    .split(",")
    .map((segment) =>
      segment
        .trim()
        .split(/\s+/)
        .map((word) =>
          word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "",
        )
        .join(" "),
    )
    .join(", ");
}

export const revalidate = 86400;

export const metadata: Metadata = createPageMetadata({
  title: "Categories | Cookbook",
  description: "Browse recipe collections by course and cuisine.",
  path: "/categories",
});

async function getCategories() {
  try {
    const [courses, cuisines] = await withDatabaseRetry(() =>
      Promise.all([
        prisma.recipe.groupBy({
          by: ["course"],
          _count: true,
          where: { course: { not: null } },
        }),
        prisma.recipe.groupBy({
          by: ["cuisine"],
          _count: true,
          where: { cuisine: { not: null } },
        }),
      ]),
    );

    return [
      ...courses.map((course) => {
        const { _count: count } = course;

        return {
          name: course.course ? formatCategoryName(course.course) : "Unknown",
          value: course.course,
          count,
          type: "course",
        };
      }),
      ...cuisines.map((cuisine) => {
        const { _count: count } = cuisine;

        return {
          name: formatCategoryName(cuisine.cuisine ?? ""),
          value: cuisine.cuisine,
          count,
          type: "cuisine",
        };
      }),
    ].toSorted((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error fetching categories:", error);

    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <AppLayout
      contentType="cards"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Categories", active: true },
      ]}
      title="Categories"
      description={`Browse ${categories.length} collections of recipes.`}
    >
      {categories.length === 0 ? (
        <ContentEmptyState
          icon="📭"
          title="No categories yet"
          description="Add a few recipes and we will build your category map automatically."
          actionHref="/recipes/new"
          actionLabel="Add Recipe"
        />
      ) : (
        <div className="flex flex-col gap-10">
          {(["course", "cuisine"] as const).map((type) => {
            const group = categories.filter((category) => category.type === type);

            if (group.length === 0) {
              return null;
            }

            return (
              <section key={type}>
                <h2 className="mbe-3 font-display text-2xl font-semibold sm:text-3xl">
                  {type === "course" ? "Courses" : "Cuisines"}
                </h2>
                <ul className="grid border-bs border-border/70 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
                  {group.map((category) => (
                    <li key={category.name} className="border-be border-border/70">
                      <Link
                        href={`/recipes?category=${encodeURIComponent((category.value ?? category.name).toLowerCase())}`}
                        className="group flex items-baseline justify-between gap-4 py-3"
                      >
                        <span
                          className="truncate font-display text-xl font-semibold transition-colors group-hover:text-primary sm:text-2xl"
                          title={category.name}
                        >
                          {category.name}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                          {category.count} {category.count === 1 ? "recipe" : "recipes"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
