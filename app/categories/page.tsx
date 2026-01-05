import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ListingPageLayout } from "@/components/layout/page-layout";

const courseIcons: Record<string, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🥪",
  DINNER: "🍖",
  DESSERT: "🍰",
  SNACK: "🍿",
  DRINK: "🥤",
  APPETIZER: "🥟",
  SALAD: "🥗",
  SOUP: "🍲",
  SIDE: "🍟",
};

export const revalidate = 86400;

async function getCategories() {
  const [courses, cuisines] = await Promise.all([
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
  ]);

  const categories = [
    ...courses.map((c) => ({
      name: c.course
        ? c.course.charAt(0) + c.course.slice(1).toLowerCase()
        : "Unknown",
      value: c.course,
      count: c._count,
      type: "course",
      icon: courseIcons[c.course as string] || "🍽️",
    })),
    ...cuisines.map((c) => ({
      name: c.cuisine!,
      value: c.cuisine,
      count: c._count,
      type: "cuisine",
      icon: "🌍",
    })),
  ].sort((a, b) => b.count - a.count);

  return categories;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <ListingPageLayout
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Categories", active: true },
      ]}
      title="Categories"
      description={`Browse ${categories.length} collections of recipes.`}
    >
      {categories.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <span className="mb-4 block text-4xl">📭</span>
          No categories found. Add some recipes!
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={`${category.type}-${category.name}`}
              href={`/recipes?category=${encodeURIComponent(category.name.toLowerCase())}`}
              className="group"
            >
              <Card className="border-border/40 bg-card hover:border-primary/20 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <span className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-110">
                    {category.icon}
                  </span>
                  <h3 className="text-foreground group-hover:text-primary mb-2 font-serif text-2xl font-semibold transition-colors">
                    {category.name}
                  </h3>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      {category.type}
                    </span>
                    <span>{category.count} recipes</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ListingPageLayout>
  );
}
