"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "hover-wiggle flex items-center gap-2 transition-opacity hover:opacity-90",
        className,
      )}
    >
      <div className="relative h-10 w-10 transition-transform duration-300 hover:scale-110">
        <Image
          src="/logo-bg.png"
          alt="Janella's Cookbook"
          fill
          className="object-contain object-left"
          priority
        />
      </div>
    </Link>
  );
}
