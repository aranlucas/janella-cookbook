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
          "hover:text-primary rounded-lg px-4 py-3 text-lg font-medium transition-colors",
          isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
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
        "group hover:text-primary relative text-sm font-medium tracking-wide transition-colors duration-300",
        isActive ? "text-primary font-semibold" : "text-muted-foreground",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "bg-primary absolute -bottom-1 left-0 h-px w-full transition-transform duration-300 ease-in-out",
          isActive
            ? "scale-x-100"
            : "origin-left scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}
