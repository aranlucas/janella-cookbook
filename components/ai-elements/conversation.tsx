import { cn } from "@/lib/utils";
import { ComponentProps, forwardRef } from "react";

type ConversationProps = ComponentProps<"div">;

export const Conversation = forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full flex-col overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-sage/20 scrollbar-track-transparent",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Conversation.displayName = "Conversation";
