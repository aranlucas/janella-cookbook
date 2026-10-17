import { LegalPage } from "@/components/layout/legal-page";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service | Cookbook",
  description: "Terms and conditions for using Janella Cookbook.",
  path: "/terms",
});

export default function TermsPage() {
  const sections = [
    {
      id: "agreement",
      title: "Agreement to Terms",
      body: "By accessing or using Janella's Kitchen, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.",
    },
    {
      id: "content",
      title: "Content",
      body: 'Our content is for informational purposes only. The recipes are provided "as is" and we make no guarantees regarding the outcome.',
    },
    {
      id: "changes",
      title: "Changes",
      body: "We reserve the right to modify or replace these Terms at any time.",
    },
  ] as const;

  return <LegalPage title="Terms of Service" updated="January 2026" sections={sections} />;
}
