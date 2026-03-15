import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Heart,
  Layers,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
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
  challengeRecipe: {
    slug: string;
    title: string;
    totalTime: number | null;
    cookCount: number;
    isFavorite: boolean;
  } | null;
  favoriteCuisine: {
    name: string;
    count: number;
  } | null;
  fastestCount: number;
  momentumScore: number;
}

interface DashboardCard {
  label: string;
  value: number;
  icon: LucideIcon;
  emoji: string;
  trend: string;
  tone: string;
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
      challengeRecipe,
      favoriteCuisine,
      fastestCount,
      momentumScore,
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
      prisma.recipe.findFirst({
        select: {
          slug: true,
          title: true,
          totalTime: true,
          cookCount: true,
          isFavorite: true,
        },
        where: {
          OR: [{ cookCount: 0 }, { lastCooked: null }],
        },
        orderBy: [{ isFavorite: "desc" }, { updatedAt: "asc" }],
      }),
      prisma.recipe.groupBy({
        by: ["cuisine"],
        where: { cuisine: { not: null } },
        _count: { cuisine: true },
        orderBy: { _count: { cuisine: "desc" } },
        take: 1,
      }),
      prisma.recipe.count({
        where: {
          OR: [{ totalTime: { lte: 30 } }, { prepTime: { lte: 10 } }],
        },
      }),
      prisma.recipe.aggregate({
        _sum: { cookCount: true },
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
      challengeRecipe,
      favoriteCuisine:
        favoriteCuisine.length > 0 && favoriteCuisine[0].cuisine
          ? {
              name: favoriteCuisine[0].cuisine,
              count: favoriteCuisine[0]._count.cuisine,
            }
          : null,
      fastestCount,
      momentumScore:
        (momentumScore._sum.cookCount ?? 0) +
        statsBonus(recentlyUpdated, favorites),
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
      challengeRecipe: null,
      favoriteCuisine: null,
      fastestCount: 0,
      momentumScore: 0,
    };
  }
}

function statsBonus(recentlyUpdated: number, favorites: number): number {
  return Math.round(recentlyUpdated * 1.5 + favorites * 0.5);
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards: DashboardCard[] = [
    {
      label: "Total Recipes",
      value: stats.totalRecipes,
      icon: BookOpen,
      tone: "from-primary/20 to-primary/5",
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
      tone: "from-rose-400/20 to-rose-300/5",
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
      tone: "from-amber-400/20 to-amber-300/5",
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
      tone: "from-sky-400/20 to-sky-300/5",
      emoji: "🆕",
      trend:
        stats.recentlyAdded - stats.recentlyAddedPrevPeriod >= 0
          ? `+${stats.recentlyAdded - stats.recentlyAddedPrevPeriod} vs prior 7 days`
          : `${stats.recentlyAdded - stats.recentlyAddedPrevPeriod} vs prior 7 days`,
    },
  ];

  const momentumLevel =
    stats.momentumScore > 60
      ? "🔥 On fire"
      : stats.momentumScore > 20
        ? "⚡ Building momentum"
        : "🌱 Getting started";

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
        <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Weekly Pulse
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
                {stats.recentlyUpdated} recipes tuned this week
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep the streak alive: update or cook one recipe today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{momentumLevel}</Badge>
              <Badge variant="outline">{stats.fastestCount} quick wins</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className="group relative overflow-hidden border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.tone}`}
                />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    {card.label}
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-foreground transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-4 w-4" />
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
                  <p className="mt-3 text-sm">{card.emoji}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
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
                      <div className="flex items-center gap-2">
                        {recipe.isFavorite && (
                          <Badge
                            variant="secondary"
                            className="transition-transform duration-200 group-hover:scale-105"
                          >
                            ❤️ Favorite
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Chef DNA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border border-border/70 bg-muted/25 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Momentum score
                  </p>
                  <Badge variant="outline">{momentumLevel}</Badge>
                </div>
                <p className="font-serif text-4xl font-bold">
                  {stats.momentumScore}
                </p>
                <p className="text-xs text-muted-foreground">
                  Weighted from cook counts, favorites, and weekly updates.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Comfort zone</p>
                  <p className="mt-1 text-sm font-semibold">
                    {stats.favoriteCuisine?.name ?? "Not enough data"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Quick wins</p>
                  <p className="mt-1 text-sm font-semibold">
                    {stats.fastestCount} recipes
                  </p>
                </div>
              </div>

              {stats.challengeRecipe ? (
                <Link
                  href={`/recipe/${stats.challengeRecipe.slug}`}
                  className="group block rounded-lg border border-dashed border-primary/50 bg-primary/5 px-4 py-3 transition hover:bg-primary/10"
                >
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    Today&apos;s adventure pick
                  </p>
                  <p className="mt-1 font-medium group-hover:text-primary">
                    {stats.challengeRecipe.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.challengeRecipe.totalTime
                      ? `${stats.challengeRecipe.totalTime} min • `
                      : "No time estimate • "}
                    {stats.challengeRecipe.cookCount > 0
                      ? `Cooked ${stats.challengeRecipe.cookCount} times`
                      : "Never cooked before"}
                    {stats.challengeRecipe.isFavorite ? " • Favorite pick" : ""}
                  </p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You&apos;ve cooked everything recently. Add a new recipe to
                  unlock your next challenge.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
