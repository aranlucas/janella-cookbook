import { AppLayout } from "@/components/layout/app-layout";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | Cookbook",
  description: "Read how Janella Cookbook handles privacy and data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Privacy Policy", active: true },
      ]}
    >
      <h1 className="mb-8 font-serif text-4xl font-bold text-foreground">
        Privacy Policy
      </h1>

      <div className="prose prose-stone dark:prose-invert max-w-none">
        <p className="text-lg leading-relaxed text-muted-foreground">
          Last updated: January 2026
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Introduction
        </h2>
        <p className="mt-4 text-muted-foreground">
          Janella&apos;s Kitchen (&quot;we,&quot; &quot;our,&quot; or
          &quot;us&quot;) respects your privacy. This Privacy Policy explains
          how we collect, use, and act on your personal information when you
          visit our website.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Information We Collect
        </h2>
        <p className="mt-4 text-muted-foreground">
          We do not currently collect personal data or use cookies for tracking
          purposes. This is a personal project used for educational and private
          use.
        </p>

        <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
          Contact Us
        </h2>
        <p className="mt-4 text-muted-foreground">
          If you have any questions about this Privacy Policy, please contact
          us.
        </p>
      </div>
    </AppLayout>
  );
}
