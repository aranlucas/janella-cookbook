import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { StatusMessage } from "@/components/layout/status-message";
import { ButtonLink } from "@/components/recipe/button-link";

export const metadata: Metadata = {
  title: "Page not found | Cookbook",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <AppLayout customContent>
      <StatusMessage
        kicker="Error 404"
        title="That page isn't in the cookbook"
        description="The link may be out of date, or the recipe may have been deleted."
        actions={
          <>
            <ButtonLink href="/recipes" size="lg" className="px-5">
              Browse recipes
            </ButtonLink>
            <ButtonLink href="/search" variant="outline" size="lg" className="px-5">
              Search
            </ButtonLink>
          </>
        }
      />
    </AppLayout>
  );
}
