"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";
import { MobileNav } from "./mobile-nav";
import { ShoppingListDrawer } from "@/components/shopping/shopping-list-drawer";

const navItems = [
  { href: "/recipes", label: "Recipes" },
  { href: "/categories", label: "Categories" },
  { href: "/favorites", label: "Favorites" },
  { href: "/chat", label: "AI Assistant" },
];

export function Header() {
  return (
    <header className="no-print sticky inset-bs-0 z-50 w-full border-be border-border/70 bg-background/92 backdrop-blur-xl supports-backdrop-filter:bg-background/80">
      <div className="container flex h-14 items-center gap-2 sm:h-16">
        <Logo />

        {/* Desktop Navigation */}
        <nav aria-label="Main" className="ms-10 hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <ShoppingListDrawer />

          {/* Chat shortcut for screens without the full nav */}
          <Link
            href="/chat"
            aria-label="AI Chat Assistant"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9 lg:hidden")}
          >
            <MessageSquare className="size-5" />
          </Link>

          <div className="block sm:hidden">
            <AddRecipeButton variant="icon" />
          </div>

          <div className="hidden sm:block">
            <AddRecipeButton variant="desktop" />
          </div>

          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
