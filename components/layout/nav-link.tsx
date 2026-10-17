"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "desktop" | "mobile";
  readonly className?: string;
}

export function NavLink({ href, children, onClick, variant = "desktop", className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "rounded-lg px-4 py-2.5 font-display text-2xl font-medium transition-colors",
          isActive ? "text-primary" : "text-foreground hover:text-primary",
          className,
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative text-nav font-medium transition-colors duration-200",
        isActive
          ? "squiggle-underline text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
