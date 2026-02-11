import Link from "next/link";
import { BookOpen, Clock3, Heart, Layers } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentEmptyState } from "@/components/ui/content-state";
import { ButtonLink } from "@/components/recipe/button-link";
import { prisma } from "@/lib/prisma";
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
  recentlyAddedPrevPeriod: number;
  recentlyUpdated: number;
  createdLast30Days: number;
  favoritesLast30Days: number;
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
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const [
      totalRecipes,
      favorites,
      courses,
      cuisines,
      recentlyAdded,
      recentlyAddedPrevPeriod,
      recentlyUpdated,
      createdLast30Days,
      favoritesLast30Days,
      latestRecipes,
    ] = await Promise.all([
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
      prisma.recipe.count({
        where: {
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.recipe.count({
        where: { updatedAt: { gte: sevenDaysAgo } },
      }),
      prisma.recipe.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.recipe.count({
        where: {
          isFavorite: true,
          updatedAt: { gte: thirtyDaysAgo },
        },
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
      recentlyAddedPrevPeriod,
      recentlyUpdated,
      createdLast30Days,
      favoritesLast30Days,
      latestRecipes,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalRecipes: 0,
      favorites: 0,
      categories: 0,
      recentlyAdded: 0,
      recentlyAddedPrevPeriod: 0,
      recentlyUpdated: 0,
      createdLast30Days: 0,
      favoritesLast30Days: 0,
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
      emoji: "📖",
      trend:
        stats.createdLast30Days > 0
          ? `${stats.createdLast30Days} added in 30 days`
          : "No new recipes this month",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Heart,
      tone: "text-accent",
      emoji: "❤️",
      trend:
        stats.favoritesLast30Days > 0
          ? `${stats.favoritesLast30Days} touched in 30 days`
          : "No favorite activity this month",
    },
    {
      label: "Categories",
      value: stats.categories,
      icon: Layers,
      tone: "text-highlight",
      emoji: "🏷️",
      trend:
        stats.categories > 0
          ? "Across courses and cuisines"
          : "Add recipes to build categories",
    },
    {
      label: "Added (7 days)",
      value: stats.recentlyAdded,
      icon: Clock3,
      tone: "text-muted-foreground",
      emoji: "🆕",
      trend:
        stats.recentlyAdded - stats.recentlyAddedPrevPeriod >= 0
          ? `+${stats.recentlyAdded - stats.recentlyAddedPrevPeriod} vs prior 7 days`
          : `${stats.recentlyAdded - stats.recentlyAddedPrevPeriod} vs prior 7 days`,
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
          {cards.map((card, i) => (
            <Card
              key={card.label}
              className="group border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  {card.label}
                  <span className="inline-block transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">
                    {card.emoji}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-3xl font-bold transition-transform duration-200 group-hover:scale-105">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {card.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-xl border border-border/45 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          {stats.recentlyUpdated} recipes were updated in the last 7 days.
        </div>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">
              Recently Updated
            </CardTitle>
            <ButtonLink href="/recipes" variant="outline" size="sm">
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
                    className="group flex items-center justify-between rounded-lg border border-border/70 px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:bg-muted/50 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium transition-colors duration-200 group-hover:text-primary">
                        {recipe.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {recipe.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    {recipe.isFavorite && (
                      <Badge
                        variant="secondary"
                        className="transition-transform duration-200 group-hover:scale-105"
                      >
                        ❤️ Favorite
                      </Badge>
                    )}
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
