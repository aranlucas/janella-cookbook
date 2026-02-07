import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border/40 bg-muted/50 border-t pt-10 pb-8">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4 lg:gap-10">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-foreground font-serif text-2xl font-bold tracking-tight">
              Janella&apos;s{" "}
              <span className="text-primary italic">Kitchen</span>
            </h3>
            <p className="text-muted-foreground max-w-xs leading-relaxed">
              A personal collection of cherished recipes, built with love for
              home cooks everywhere. Good food, simply found.
            </p>
          </div>

          {/* Links Column */}
          <div className="space-y-4">
            <h4 className="text-foreground font-serif text-lg font-semibold">
              Explore
            </h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link
                  href="/recipes"
                  className="hover:text-primary transition-colors"
                >
                  All Recipes
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="hover:text-primary transition-colors"
                >
                  By Category
                </Link>
              </li>

              <li>
                <Link
                  href="/favorites"
                  className="hover:text-primary transition-colors"
                >
                  Favorites
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-4">
            <h4 className="text-foreground font-serif text-lg font-semibold">
              Connect
            </h4>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-primary transition-colors"
                >
                  About Janella
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border/40 text-muted-foreground mt-10 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Janella&apos;s Kitchen. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
