import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { SearchBar } from "@/components/search/search-bar";
import { RecipeGrid } from "@/components/recipe/recipe-grid";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipeImage } from "@/components/ui/recipe-image";
import { cn } from "@/lib/utils";
import type { Course, RecipeWithRelations } from "@/types/recipe";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Cookbook - Your Personal Recipe Collection",
  description:
    "A modern cookbook app to collect, organize, and discover recipes with intelligent semantic search.",
  path: "/",
});

// Revalidate every 24 hours, or on-demand via revalidatePath("/")
export const revalidate = 86400;

const QUICK_SEARCHES = ["Breakfast", "Pasta", "Dessert", "Vegan", "Quick & Easy"];

// Meal order reads more naturally than alphabetical or by count
const COURSE_ORDER: readonly Course[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "APPETIZER",
  "SIDE",
  "SAUCE",
  "BREAD",
  "SNACK",
  "DESSERT",
  "DRINK",
];

const recipeInclude = {
  ingredients: { orderBy: { sortOrder: "asc" } },
  instructions: { orderBy: { sortOrder: "asc" } },
  tags: true,
  images: true,
} as const;

interface CourseCount {
  readonly course: Course;
  readonly count: number;
}

interface MostCookedProps {
  readonly recipe: RecipeWithRelations;
}

interface SectionHeadingProps {
  readonly title: string;
  readonly href: string;
  readonly linkLabel: string;
}

interface HomeData {
  readonly recent: RecipeWithRelations[];
  readonly mostCooked: RecipeWithRelations | null;
  readonly courses: readonly CourseCount[];
}

async function getHomeData(): Promise<HomeData> {
  try {
    const [recent, mostCooked, courseCounts] = await Promise.all([
      prisma.recipe.findMany({
        include: recipeInclude,
        orderBy: { updatedAt: "desc" },
        take: 9,
      }),
      prisma.recipe.findFirst({
        include: recipeInclude,
        where: { imageUrl: { not: null }, cookCount: { gt: 0 } },
        orderBy: [{ cookCount: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.recipe.groupBy({
        by: ["course"],
        _count: true,
        where: { course: { not: null } },
      }),
    ]);

    const courses = COURSE_ORDER.flatMap((course) => {
      const match = courseCounts.find((entry) => entry.course === course);

      if (!match) {
        return [];
      }

      const { _count: count } = match;

      return [{ course, count }];
    });

    return { recent, mostCooked, courses };
  } catch (error) {
    console.error("Error fetching home page data:", error);

    return { recent: [], mostCooked: null, courses: [] };
  }
}

function formatCourse(course: Course): string {
  return course.charAt(0) + course.slice(1).toLowerCase();
}

function MostCooked({ recipe }: MostCookedProps) {
  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group block rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:animate-in motion-safe:delay-200 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:fade-in"
    >
      <figure>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-muted lg:aspect-5/4">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
          />
        </div>
        <figcaption className="flex items-baseline justify-between gap-4 pbs-3">
          <span className="font-display text-xl leading-tight font-semibold transition-colors group-hover:text-primary sm:text-2xl">
            {recipe.title}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            Cooked {recipe.cookCount} {recipe.cookCount === 1 ? "time" : "times"}
          </span>
        </figcaption>
      </figure>
    </Link>
  );
}

function SectionHeading({ title, href, linkLabel }: SectionHeadingProps) {
  return (
    <div className="mbe-5 flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl leading-none font-semibold sm:text-4xl">{title}</h2>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:text-base"
      >
        {linkLabel}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const { recent, mostCooked, courses } = await getHomeData();
  const [lead, ...rest] = recent;

  return (
    <AppLayout customContent>
      {/* Hero */}
      <section className="container grid items-center gap-6 pbs-6 pbe-8 sm:pbs-8 lg:grid-cols-12 lg:gap-10 lg:pbs-10 lg:pbe-12">
        <div className={cn(mostCooked ? "lg:col-span-7" : "lg:col-span-9")}>
          <h1 className="font-display text-wordmark font-bold text-foreground motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-3">
            Janella&apos;s
            <br />
            Kitchen
          </h1>
          <p className="mbs-4 max-w-md text-lg text-muted-foreground sm:mbs-5 sm:text-xl">
            Good food, simply found. Every recipe worth making again, in one place.
          </p>

          <Suspense fallback={<div className="mbs-6 h-12 max-w-xl sm:h-15" />}>
            <SearchBar
              size="large"
              placeholder="Search by ingredient, craving, or season..."
              className="mbs-6 max-w-xl"
            />
          </Suspense>

          <div className="mbs-3 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="me-1 text-muted-foreground">Try</span>
            {QUICK_SEARCHES.map((label) => (
              <Link
                key={label}
                href={`/recipes?q=${encodeURIComponent(label)}`}
                className="rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground transition-colors hover:border-highlight hover:bg-highlight hover:text-highlight-foreground"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {mostCooked && (
          <div className="lg:col-span-5">
            <MostCooked recipe={mostCooked} />
          </div>
        )}
      </section>

      {/* Recent recipes */}
      <section className="border-bs border-border/70 py-8 sm:py-10">
        <div className="container">
          <SectionHeading title="Recent Recipes" href="/recipes" linkLabel="All recipes" />

          {lead ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3 xl:grid-cols-4">
              <RecipeCard
                recipe={lead}
                variant="feature"
                priority={!mostCooked}
                className="col-span-2 lg:row-span-2"
              />
              {rest.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <RecipeGrid recipes={[]} />
          )}
        </div>
      </section>

      {/* Course index */}
      {courses.length > 0 && (
        <section className="border-bs border-border/70 py-12 sm:py-16">
          <div className="container">
            <SectionHeading
              title="Browse by course"
              href="/categories"
              linkLabel="All categories"
            />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 sm:gap-x-10">
              {courses.map(({ course, count }) => (
                <li key={course}>
                  <Link
                    href={`/recipes?category=${course.toLowerCase()}`}
                    className="group inline-flex items-start gap-1.5"
                  >
                    <span className="font-display text-3xl font-semibold transition-colors group-hover:text-primary sm:text-4xl">
                      {formatCourse(course)}
                    </span>
                    <span className="mbs-1 text-sm text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
