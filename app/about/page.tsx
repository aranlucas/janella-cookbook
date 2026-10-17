import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "About | Cookbook",
  description: "Learn more about Janella and the story behind this cookbook.",
  path: "/about",
});

const PHILOSOPHY = [
  "Fresh ingredients are the heart of every dish.",
  "Recipes are meant to be shared and adapted.",
  "Cooking is an act of care for yourself and others.",
];

export default function AboutPage() {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "About", active: true },
      ]}
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="font-display text-5xl leading-display font-semibold text-foreground sm:text-6xl lg:text-7xl">
            About the cook
          </h1>
          <div className="mbs-6 flex max-w-prose flex-col gap-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              Welcome to Janella&apos;s Kitchen. This digital cookbook is a labor of love, designed
              to organize and share the recipes that have brought joy to my family and friends over
              the years.
            </p>
            <p>
              From simple weeknight dinners to elaborate holiday feasts, every recipe here has a
              story. I believe that cooking shouldn&apos;t be complicated. It should be about good
              ingredients, clear instructions, and the pleasure of sharing a meal.
            </p>
            <p>
              I hope this collection inspires you to get into the kitchen and create something
              delicious.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-10 lg:col-span-5 lg:pbs-4">
          <figure className="rounded-3xl bg-card p-7 sm:p-9">
            <blockquote className="font-display text-3xl leading-tight font-medium text-foreground italic sm:text-4xl">
              &ldquo;Cook what you love. Share what you learn.&rdquo;
            </blockquote>
            <figcaption className="mbs-4 text-sm text-muted-foreground">Janella</figcaption>
          </figure>

          <div>
            <h2 className="font-display text-2xl font-semibold">Philosophy</h2>
            <ul className="mbs-3 flex flex-col">
              {PHILOSOPHY.map((belief) => (
                <li
                  key={belief}
                  className="flex gap-3 border-be border-border/70 py-3 text-base text-foreground last:border-be-0"
                >
                  <span
                    aria-hidden="true"
                    className="mbs-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  {belief}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
