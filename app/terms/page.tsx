import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function TermsPage() {
  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-16">
        <div className="container max-w-3xl">
          <h1 className="text-foreground mb-8 font-serif text-4xl font-bold">
            Terms of Service
          </h1>

          <div className="prose prose-stone dark:prose-invert max-w-none">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Last updated: January 2026
            </p>

            <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
              Agreement to Terms
            </h2>
            <p className="text-muted-foreground mt-4">
              accessing or using Janella&apos;s Kitchen, you agree to be bound
              by these Terms of Service. If you disagree with any part of the
              terms, then you may not access the service.
            </p>

            <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
              Content
            </h2>
            <p className="text-muted-foreground mt-4">
              Our content is for informational purposes only. The recipes are
              provided &quot;as is&quot; and we make no guarantees regarding the
              outcome.
            </p>

            <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
              Changes
            </h2>
            <p className="text-muted-foreground mt-4">
              We reserve the right to modify or replace these Terms at any time.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
