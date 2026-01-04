import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <span className="text-primary font-serif text-xl font-bold tracking-tight sm:text-2xl">
        Janella&apos;s Cookbook
      </span>
    </Link>
  );
}
