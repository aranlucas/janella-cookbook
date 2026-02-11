"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";
import { MobileNav } from "./mobile-nav";

const navItems = [
  { href: "/recipes", label: "Recipes" },
  { href: "/chat", label: "AI Assistant" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/35 bg-background/92 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="container flex h-14 items-center gap-2 sm:h-16">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="ml-3 hidden items-center space-x-5 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Chat icon button visible on mobile only */}
          <Link
            href="/chat"
            aria-label="AI Chat Assistant"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-9 w-9 md:hidden",
            )}
          >
            <MessageSquare className="h-5 w-5" />
          </Link>

          {/* Icon button visible on small mobile, hidden on larger screens */}
          <div className="block sm:hidden">
            <AddRecipeButton variant="icon" />
          </div>

          {/* Full button visible on sm+ screens, hidden on mobile */}
          <div className="hidden sm:block">
            <AddRecipeButton variant="desktop" />
          </div>

          {/* Hamburger menu for mobile */}
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
