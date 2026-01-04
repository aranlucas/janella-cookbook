"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Recipes" },
    { href: "/search", label: "Search" },
  ];

  return (
    <header className="border-butter bg-warm-white/95 supports-[backdrop-filter]:bg-warm-white/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-terracotta font-serif text-xl font-bold sm:text-2xl">
            Janella's Cookbook
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="ml-8 hidden items-center space-x-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hover:text-terracotta text-sm font-medium transition-colors",
                pathname === item.href ? "text-terracotta" : "text-charcoal/70",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Desktop Button */}
          <Link href="/add" className="hidden sm:block">
            <Button className="bg-terracotta hover:bg-rust text-warm-white">
              + New Recipe
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-charcoal">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-warm-white w-[280px]">
              <nav className="mt-8 flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "hover:text-terracotta rounded-lg px-4 py-2 text-lg font-medium transition-colors",
                      pathname === item.href
                        ? "text-terracotta bg-butter/30"
                        : "text-charcoal/70",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/add"
                  onClick={() => setIsOpen(false)}
                  className="mt-4"
                >
                  <Button className="bg-terracotta hover:bg-rust text-warm-white w-full">
                    + New Recipe
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
