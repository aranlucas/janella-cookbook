import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service | Cookbook",
  description: "Terms and conditions for using Janella Cookbook.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Terms of Service", active: true },
      ]}
      contentMaxWidth="3xl"
    >
      <h1 className="mb-8 font-serif text-4xl font-bold text-foreground">
        Terms of Service
      </h1>

      <div className="prose prose-stone dark:prose-invert max-w-none">
        <p className="text-lg leading-relaxed text-muted-foreground">
          Last updated: January 2026
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Agreement to Terms
        </h2>
        <p className="mt-4 text-muted-foreground">
          By accessing or using Janella&apos;s Kitchen, you agree to be bound by
          these Terms of Service. If you disagree with any part of the terms,
          then you may not access the service.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Content
        </h2>
        <p className="mt-4 text-muted-foreground">
          Our content is for informational purposes only. The recipes are
          provided &quot;as is&quot; and we make no guarantees regarding the
          outcome.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Changes
        </h2>
        <p className="mt-4 text-muted-foreground">
          We reserve the right to modify or replace these Terms at any time.
        </p>
      </div>
    </AppLayout>
  );
}
