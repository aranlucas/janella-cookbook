import Link from "next/link";
import { ArrowRight, BookOpen, Heart } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { EmptyState } from "@/components/layout/page-state";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { formatMinutes } from "@/lib/utils";

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

interface DashboardStat {
  label: string;
  value: number;
  trend: string;
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

    const favoriteCuisineSummary = favoriteCuisine.map(({ cuisine, _count: count }) => ({
      cuisine,
      count: count.cuisine,
    }))[0];

    const { _sum: sums } = momentumScore;

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
      favoriteCuisine: favoriteCuisineSummary?.cuisine
        ? {
            name: favoriteCuisineSummary.cuisine,
            count: favoriteCuisineSummary.count,
          }
        : null,
      fastestCount,
      momentumScore: (sums.cookCount ?? 0) + statsBonus(recentlyUpdated, favorites),
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

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const addedDelta = stats.recentlyAdded - stats.recentlyAddedPrevPeriod;

  const statRow: DashboardStat[] = [
    {
      label: "Recipes",
      value: stats.totalRecipes,
      trend:
        stats.createdLast30Days > 0
          ? `${stats.createdLast30Days} added in 30 days`
          : "None added this month",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      trend:
        stats.favoritesLast30Days > 0
          ? `${stats.favoritesLast30Days} touched in 30 days`
          : "No favorite activity this month",
    },
    {
      label: "Categories",
      value: stats.categories,
      trend: stats.categories > 0 ? "Courses and cuisines" : "Add recipes to build categories",
    },
    {
      label: "Added this week",
      value: stats.recentlyAdded,
      trend: `${addedDelta >= 0 ? "+" : ""}${addedDelta} vs the week before`,
    },
  ];

  const momentumLevel =
    stats.momentumScore > 60
      ? "On fire"
      : stats.momentumScore > 20
        ? "Building momentum"
        : "Getting started";

  return (
    <AppLayout
      contentType="cards"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", active: true },
      ]}
      title="Dashboard"
      description={`${stats.recentlyUpdated} ${stats.recentlyUpdated === 1 ? "recipe" : "recipes"} updated this week. Cook or tweak one today to keep it going.`}
    >
      <div className="flex flex-col gap-10">
        <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {statRow.map((stat) => (
            <div key={stat.label} className="border-bs border-border/80 pbs-3">
              <dt className="text-sm font-medium text-foreground">{stat.label}</dt>
              <dd className="mbs-1 font-display text-5xl leading-none font-semibold tabular-nums">
                {stat.value}
              </dd>
              <dd className="mbs-2 text-sm text-muted-foreground">{stat.trend}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <section className="lg:col-span-7">
            <div className="mbe-3 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Recently updated</h2>
              <Link
                href="/recipes"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                All recipes
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>

            {stats.latestRecipes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No recipes yet"
                description="Add your first recipe to start filling your dashboard."
                actionHref="/recipes/new"
                actionLabel="Add Recipe"
              />
            ) : (
              <ul className="border-bs border-border/70">
                {stats.latestRecipes.map((recipe) => (
                  <li key={recipe.id} className="border-be border-border/70">
                    <Link
                      href={`/recipe/${recipe.slug}`}
                      className="group flex items-center justify-between gap-4 py-3.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-medium transition-colors group-hover:text-primary">
                          {recipe.title}
                        </span>
                        {recipe.isFavorite && (
                          <Heart
                            className="size-3.5 shrink-0 fill-primary text-primary"
                            aria-label="Favorite"
                          />
                        )}
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {shortDate.format(recipe.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-6 lg:col-span-5">
            {stats.challengeRecipe ? (
              <Link
                href={`/recipe/${stats.challengeRecipe.slug}`}
                className="group block rounded-3xl bg-card p-6 transition-colors hover:bg-secondary sm:p-7"
              >
                <p className="text-sm text-muted-foreground">Cook next</p>
                <p className="mbs-1 font-display text-3xl leading-tight font-semibold transition-colors group-hover:text-primary">
                  {stats.challengeRecipe.title}
                </p>
                <p className="mbs-2 text-sm text-muted-foreground">
                  {[
                    stats.challengeRecipe.totalTime
                      ? formatMinutes(stats.challengeRecipe.totalTime)
                      : null,
                    stats.challengeRecipe.cookCount > 0
                      ? `Cooked ${stats.challengeRecipe.cookCount} times`
                      : "Never cooked yet",
                    stats.challengeRecipe.isFavorite ? "A favorite" : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </Link>
            ) : (
              <p className="rounded-3xl bg-card p-6 text-muted-foreground sm:p-7">
                You&apos;ve cooked everything recently. Add a new recipe to find your next one.
              </p>
            )}

            <dl className="flex flex-col">
              {[
                {
                  label: "Most-saved cuisine",
                  value: stats.favoriteCuisine?.name ?? "Not enough data",
                },
                { label: "Ready in 30 minutes", value: `${stats.fastestCount} recipes` },
                {
                  label: "Momentum",
                  value: `${stats.momentumScore}, ${momentumLevel.toLowerCase()}`,
                },
              ].map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4 border-be border-border/70 py-3"
                >
                  <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                  <dd className="text-base font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className="-mbs-3 text-xs text-muted-foreground">
              Momentum blends cook counts, favorites, and this week&apos;s updates.
            </p>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
