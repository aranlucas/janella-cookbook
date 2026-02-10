"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "desktop" | "mobile";
  className?: string;
}

export function NavLink({
  href,
  children,
  onClick,
  variant = "desktop",
  className,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "rounded-lg px-4 py-3 text-lg font-medium transition-colors hover:text-primary",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
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
      className={cn(
        "relative text-sm font-medium tracking-wide transition-colors duration-300 hover:text-primary",
        isActive
          ? "squiggle-underline font-semibold text-primary"
          : "text-muted-foreground",
        !isActive && "hover-squish squiggle-underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
