import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RecipeNotFound() {
  return (
    <div className="bg-cream flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md">
          <div className="mb-6 text-6xl">🔍</div>
          <h1 className="text-foreground mb-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Recipe not found
          </h1>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            We couldn&apos;t find this recipe. It may have been removed or the
            link might be outdated.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/recipes"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Browse recipes
            </Link>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Go home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
