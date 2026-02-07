import Link from "next/link";
import { BookOpen, Clock3, Heart, Layers } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentEmptyState } from "@/components/ui/content-state";
import { ButtonLink } from "@/components/recipe/button-link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  title: "Dashboard | Cookbook",
  description: "A live overview of your cookbook collection.",
  path: "/dashboard",
});

interface DashboardStats {
  totalRecipes: number;
  favorites: number;
  categories: number;
  recentlyAdded: number;
  latestRecipes: Array<{
    id: string;
    title: string;
    slug: string;
    isFavorite: boolean;
    updatedAt: Date;
  }>;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const [totalRecipes, favorites, courses, cuisines, recentlyAdded, latestRecipes] =
      await Promise.all([
        prisma.recipe.count(),
        prisma.recipe.count({ where: { isFavorite: true } }),
        prisma.recipe.groupBy({
          by: ["course"],
          where: { course: { not: null } },
        }),
        prisma.recipe.groupBy({
          by: ["cuisine"],
          where: { cuisine: { not: null } },
        }),
        prisma.recipe.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.recipe.findMany({
          select: {
            id: true,
            title: true,
            slug: true,
            isFavorite: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
      ]);

    const categories = new Set([
      ...courses.map((entry) => entry.course),
      ...cuisines.map((entry) => entry.cuisine),
    ]).size;

    return {
      totalRecipes,
      favorites,
      categories,
      recentlyAdded,
      latestRecipes,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalRecipes: 0,
      favorites: 0,
      categories: 0,
      recentlyAdded: 0,
      latestRecipes: [],
    };
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "Total Recipes",
      value: stats.totalRecipes,
      icon: BookOpen,
      tone: "text-primary",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Heart,
      tone: "text-accent",
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: Layers,
      tone: "text-highlight",
    },
    {
      label: "Added (7 days)",
      value: stats.recentlyAdded,
      icon: Clock3,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <AppLayout
      contentType="cards"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", active: true },
      ]}
      title="Dashboard"
      description="A live overview of your cookbook collection."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-sm font-medium">
                  {card.label}
                  <card.icon className={cn("h-4 w-4", card.tone)} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Recently Updated</CardTitle>
            <ButtonLink
              href="/recipes"
              variant="outline"
              size="sm"
            >
              View all
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {stats.latestRecipes.length === 0 ? (
              <ContentEmptyState
                icon="📚"
                title="No recipes yet"
                description="Add your first recipe to start filling your dashboard."
                actionHref="/recipes/new"
                actionLabel="Add Recipe"
                className="py-10"
              />
            ) : (
              <div className="space-y-3">
                {stats.latestRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recipe/${recipe.slug}`}
                    className="border-border/70 hover:bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{recipe.title}</p>
                      <p className="text-muted-foreground text-xs">
                        Updated {recipe.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    {recipe.isFavorite && <Badge variant="secondary">Favorite</Badge>}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
