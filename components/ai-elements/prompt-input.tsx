import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { ComponentProps, forwardRef, KeyboardEvent } from "react";

interface PromptInputProps extends Omit<
  ComponentProps<"textarea">,
  "onSubmit"
> {
  onSubmit?: () => void;
  isLoading?: boolean;
}

export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(
  ({ className, onSubmit, isLoading, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && onSubmit) {
          onSubmit();
        }
      }
      onKeyDown?.(e);
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={cn(
            "border-sage/30 bg-warm-white w-full resize-none rounded-2xl border px-4 py-3 pr-12",
            "text-charcoal placeholder:text-charcoal/50",
            "focus:border-terracotta focus:ring-terracotta/20 focus:ring-2 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-[200px] min-h-[52px]",
            className,
          )}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          {...props}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !props.value}
          className={cn(
            "absolute right-2 bottom-2 rounded-xl p-2",
            "bg-terracotta text-warm-white",
            "hover:bg-rust transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus:ring-terracotta/50 focus:ring-2 focus:outline-none",
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  },
);

PromptInput.displayName = "PromptInput";
