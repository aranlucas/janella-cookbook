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
        <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
          <div className="bg-muted text-muted-foreground absolute inset-0 flex items-center justify-center">
            <span className="text-lg">Photo of Janella</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-foreground mb-6 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              About the <span className="text-primary italic">Cook</span>
            </h1>
            <div className="text-muted-foreground space-y-6 text-lg leading-relaxed">
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

          <div className="bg-muted/30 border-border/20 rounded-xl border p-8">
            <h3 className="text-foreground mb-4 font-serif text-xl font-semibold">
              Philosophy
            </h3>
            <ul className="space-y-3">
              <li className="text-muted-foreground flex gap-3">
                <span className="text-primary font-bold">01.</span>
                <span>Fresh ingredients are the heart of every dish.</span>
              </li>
              <li className="text-muted-foreground flex gap-3">
                <span className="text-primary font-bold">02.</span>
                <span>Recipes are meant to be shared and adapted.</span>
              </li>
              <li className="text-muted-foreground flex gap-3">
                <span className="text-primary font-bold">03.</span>
                <span>Cooking is an act of care for yourself and others.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
