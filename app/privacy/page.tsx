import { LegalPage } from "@/components/layout/legal-page";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy | Cookbook",
  description: "Read how Janella Cookbook handles privacy and data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const sections = [
    {
      id: "introduction",
      title: "Introduction",
      body: 'Janella\'s Kitchen ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and act on your personal information when you visit our website.',
    },
    {
      id: "information",
      title: "Information We Collect",
      body: "We do not currently collect personal data or use cookies for tracking purposes. This is a personal project used for educational and private use.",
    },
    {
      id: "contact",
      title: "Contact Us",
      body: "If you have any questions about this Privacy Policy, please contact us.",
    },
  ] as const;

  return <LegalPage title="Privacy Policy" updated="January 2026" sections={sections} />;
}
