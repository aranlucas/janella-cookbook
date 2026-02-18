import { AppLayout } from "@/components/layout/app-layout";
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

  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Terms of Service", active: true },
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
              Terms of Service
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
