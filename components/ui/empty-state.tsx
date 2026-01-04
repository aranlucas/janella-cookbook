import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  title = "No recipes found",
  description = "Try adjusting your search terms or filters.",
  icon = <span className="text-6xl">🔍</span>,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in zoom-in-95 flex flex-col items-center justify-center p-8 text-center duration-500",
        className,
      )}
    >
      <div className="bg-muted/50 ring-border/50 mb-6 rounded-full p-6 ring-1">
        {icon}
      </div>
      <h3 className="text-foreground mb-2 font-serif text-2xl font-bold">
        {title}
      </h3>
      <p className="text-muted-foreground mb-8 max-w-sm text-lg leading-relaxed">
        {description}
      </p>
      {action && (
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
