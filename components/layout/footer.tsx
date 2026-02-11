import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/55 pt-10 pb-8">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4 md:gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Janella&apos;s{" "}
              <span className="text-primary italic">Kitchen</span>
            </h3>
            <p className="max-w-xs leading-relaxed text-muted-foreground/95">
              A personal collection of cherished recipes, built with love for
              home cooks everywhere. Good food, simply found.
            </p>
          </div>

          {/* Links Column */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-foreground">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground/95">
              <li>
                <Link
                  href="/recipes"
                  className="inline-block transition-all duration-200 hover:translate-x-1 hover:text-primary"
                >
                  All Recipes
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="inline-block transition-all duration-200 hover:translate-x-1 hover:text-primary"
                >
                  By Category
                </Link>
              </li>
              <li>
                <Link
                  href="/favorites"
                  className="inline-block transition-all duration-200 hover:translate-x-1 hover:text-primary"
                >
                  Favorites
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-semibold text-foreground">
              Connect
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground/95">
              <li>
                <Link
                  href="/about"
                  className="inline-block transition-all duration-200 hover:translate-x-1 hover:text-primary"
                >
                  About Janella
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-xs text-muted-foreground/95 md:flex-row">
          <p>
            Made with{" "}
            <span
              className="animate-heart-pop inline-block"
              style={{
                animationIterationCount: "infinite",
                animationDuration: "2s",
              }}
            >
              ❤️
            </span>{" "}
            &copy; {new Date().getFullYear()} Janella&apos;s Kitchen
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
