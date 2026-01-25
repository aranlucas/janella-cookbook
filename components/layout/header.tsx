"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";

const navItems = [
  { href: "/recipes", label: "Recipes" },
  { href: "/chat", label: "AI Assistant" },
];

export function Header() {
  return (
    <header className="border-border/20 bg-background/90 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="container flex h-12 items-center sm:h-14">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="ml-4 hidden items-center space-x-4 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
