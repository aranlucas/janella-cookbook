"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Recipes" },
    { href: "/search", label: "Search" },
    { href: "/add", label: "Add Recipe" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-butter bg-warm-white/95 backdrop-blur supports-[backdrop-filter]:bg-warm-white/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-serif text-xl sm:text-2xl font-bold text-terracotta">
            Cookbook
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="ml-8 hidden md:flex items-center space-x-6">
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
            <SheetContent side="right" className="w-[280px] bg-warm-white">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-terracotta py-2 px-4 rounded-lg",
                      pathname === item.href
                        ? "text-terracotta bg-butter/30"
                        : "text-charcoal/70"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/add" onClick={() => setIsOpen(false)} className="mt-4">
                  <Button className="w-full bg-terracotta hover:bg-rust text-warm-white">
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
