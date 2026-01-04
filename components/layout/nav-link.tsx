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
                "hover:text-primary text-sm font-medium transition-colors",
                isActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground",
                className,
            )}
        >
            {children}
        </Link>
    );
}
