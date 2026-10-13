"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NavLink } from "./nav-link";
import { AddRecipeButton } from "./add-recipe-button";

interface NavItem {
  readonly href: string;
  readonly label: string;
}

interface MobileNavProps {
  readonly navItems: readonly NavItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="right" className="w-70 bg-background">
        <nav className="mbs-8 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} variant="mobile" onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
          <div className="mbs-6 px-4">
            <AddRecipeButton variant="mobile" onClick={closeMenu} />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
