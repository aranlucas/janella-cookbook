"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  readonly className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Janella's Kitchen home"
      className={cn("group flex shrink-0 items-center gap-2.5", className)}
    >
      <span className="hover-wiggle relative size-9 sm:size-10">
        <Image
          src="/logo-bg.png"
          alt=""
          sizes="40px"
          fill
          className="object-contain object-left"
          priority
        />
      </span>
      <span className="font-display text-xl leading-none font-semibold text-foreground transition-colors group-hover:text-primary sm:text-2xl">
        Janella&apos;s Kitchen
      </span>
    </Link>
  );
}
