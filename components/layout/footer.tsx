import Link from "next/link";

const currentYear = new Date().getFullYear();

const linkGroups = [
  {
    heading: "Explore",
    links: [
      { href: "/recipes", label: "All Recipes" },
      { href: "/categories", label: "By Category" },
      { href: "/favorites", label: "Favorites" },
    ],
  },
  {
    heading: "Kitchen",
    links: [
      { href: "/recipes/new", label: "Add a recipe" },
      { href: "/chat", label: "AI Assistant" },
      { href: "/about", label: "About Janella" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="no-print border-bs border-border/70 bg-muted/40 pbs-8 pbe-6">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-7">
            <h3 className="font-display text-3xl leading-none font-semibold text-foreground sm:text-4xl">
              Janella&apos;s Kitchen
            </h3>
            <p className="mbs-3 max-w-sm text-muted-foreground">
              A personal collection of cherished recipes for home cooks. Good food, simply found.
            </p>
          </div>

          {linkGroups.map((group) => (
            <div key={group.heading} className="md:col-span-3 lg:col-span-2">
              <h4 className="font-sans text-sm font-semibold tracking-normal text-foreground">
                {group.heading}
              </h4>
              <ul className="mbs-3 flex flex-col gap-2 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mbs-8 flex flex-col gap-3 border-bs border-border/70 pbs-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} Janella&apos;s Kitchen</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
