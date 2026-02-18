import { AppLayout } from "@/components/layout/app-layout";
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

  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Privacy Policy", active: true },
      ]}
      contentMaxWidth="5xl"
    >
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 rounded-xl border border-border/45 bg-card/70 p-4">
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              On This Page
            </p>
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-8 rounded-2xl border border-border/45 bg-card/55 p-6 sm:p-8">
          <header className="space-y-3">
            <h1 className="font-serif text-4xl font-bold text-foreground">
              Privacy Policy
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Last updated: January 2026
            </p>
          </header>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-3">
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                {section.title}
              </h2>
              <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
