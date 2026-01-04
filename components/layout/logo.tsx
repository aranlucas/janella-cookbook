import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <span className="text-terracotta font-serif text-xl font-bold sm:text-2xl">
        Janella&apos;s Cookbook
      </span>
    </Link>
  );
}
