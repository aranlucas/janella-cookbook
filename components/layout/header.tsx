"use client";

import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";
import { MobileNav } from "./mobile-nav";

const navItems = [{ href: "/", label: "Recipes" }];

export function Header() {
  return (
    <header className="border-butter bg-warm-white/95 supports-[backdrop-filter]:bg-warm-white/60 sticky top-0 z-50 w-full border-b backdrop-blur">
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

          {/* Mobile Menu - only shows hamburger on md and below */}
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
