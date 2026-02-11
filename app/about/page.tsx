import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "About | Cookbook",
  description: "Learn more about Janella and the story behind this cookbook.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "About", active: true },
      ]}
      contentMaxWidth="5xl"
    >
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/45 bg-gradient-to-br from-card via-muted/55 to-secondary/35">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,78,57,0.12),transparent_38%),radial-gradient(circle_at_78%_30%,rgba(240,168,48,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(0,0,0,0))]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-primary/35 bg-background/85 font-serif text-4xl font-bold text-primary shadow-sm">
              J
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Kitchen Notes
              </p>
              <p className="mx-auto max-w-xs font-serif text-xl text-foreground">
                “Cook what you love. Share what you learn.”
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="mb-6 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              About the <span className="text-primary italic">Cook</span>
            </h1>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>
                Welcome to Janella&apos;s Kitchen. This digital cookbook is a
                labor of love, designed to organize and share the recipes that
                have brought joy to my family and friends over the years.
              </p>
              <p>
                From simple weeknight dinners to elaborate holiday feasts, every
                recipe here has a story. I believe that cooking shouldn&apos;t
                be complicated—it should be about good ingredients, clear
                instructions, and the pleasure of sharing a meal.
              </p>
              <p>
                I hope this collection inspires you to get into the kitchen and
                create something delicious.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/20 bg-muted/30 p-8">
            <h3 className="mb-4 font-serif text-xl font-semibold text-foreground">
              Philosophy
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-3 text-muted-foreground">
                <span className="font-bold text-primary">01.</span>
                <span>Fresh ingredients are the heart of every dish.</span>
              </li>
              <li className="flex gap-3 text-muted-foreground">
                <span className="font-bold text-primary">02.</span>
                <span>Recipes are meant to be shared and adapted.</span>
              </li>
              <li className="flex gap-3 text-muted-foreground">
                <span className="font-bold text-primary">03.</span>
                <span>Cooking is an act of care for yourself and others.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
