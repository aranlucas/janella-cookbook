"use client";

import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";

const navItems = [{ href: "/", label: "Recipes" }];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center sm:h-16">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="ml-8 hidden items-center space-x-6 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
