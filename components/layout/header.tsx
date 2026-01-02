"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Recipes" },
    { href: "/search", label: "Search" },
    { href: "/add", label: "Add Recipe" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-butter bg-warm-white/95 backdrop-blur supports-[backdrop-filter]:bg-warm-white/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-serif text-2xl font-bold text-terracotta">
            Cookbook
          </span>
        </Link>
        <nav className="ml-8 flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-terracotta",
                pathname === item.href
                  ? "text-terracotta"
                  : "text-charcoal/70"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <Link href="/add">
            <Button className="bg-terracotta hover:bg-rust text-warm-white">
              + New Recipe
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
