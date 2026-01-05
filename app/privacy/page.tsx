import { AppLayout } from "@/components/layout/app-layout";

export default function PrivacyPage() {
  return (
    <AppLayout
      contentType="default"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Privacy Policy", active: true },
      ]}
    >
      <h1 className="text-foreground mb-8 font-serif text-4xl font-bold">
        Privacy Policy
      </h1>

      <div className="prose prose-stone dark:prose-invert max-w-none">
        <p className="text-muted-foreground text-lg leading-relaxed">
          Last updated: January 2026
        </p>

        <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
          Introduction
        </h2>
        <p className="text-muted-foreground mt-4">
          Janella&apos;s Kitchen (&quot;we,&quot; &quot;our,&quot; or
          &quot;us&quot;) respects your privacy. This Privacy Policy explains
          how we collect, use, and act on your personal information when you
          visit our website.
        </p>

        <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
          Information We Collect
        </h2>
        <p className="text-muted-foreground mt-4">
          We do not currently collect personal data or use cookies for tracking
          purposes. This is a personal project used for educational and private
          use.
        </p>

        <h2 className="text-foreground mt-8 font-serif text-2xl font-semibold">
          Contact Us
        </h2>
        <p className="text-muted-foreground mt-4">
          If you have any questions about this Privacy Policy, please contact
          us.
        </p>
      </div>
    </AppLayout>
  );
}
