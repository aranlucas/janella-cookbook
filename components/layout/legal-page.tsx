import { AppLayout } from "./app-layout";

interface LegalSection {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

interface LegalPageProps {
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly LegalSection[];
}

/** Shared single-column layout for the privacy policy and terms of service */
export function LegalPage({ title, updated, sections }: LegalPageProps) {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: title, active: true },
      ]}
    >
      <article className="max-w-prose">
        <header>
          <h1 className="font-display text-4xl leading-display font-semibold text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mbs-3 text-sm text-muted-foreground">Last updated {updated}</p>
        </header>

        <div className="mbs-8 flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {section.title}
              </h2>
              <p className="mbs-2 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </AppLayout>
  );
}
