import { cn } from "@/lib/utils";
import { ComponentProps, forwardRef } from "react";

// Message container component
interface MessageProps extends ComponentProps<"div"> {
  from?: "user" | "assistant" | "system";
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ from = "assistant", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full gap-3 py-4",
          from === "user" ? "justify-end" : "justify-start",
          className,
        )}
        data-from={from}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Message.displayName = "Message";

// Message content wrapper
type MessageContentProps = ComponentProps<"div">;

export const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          "data-[from=user]:bg-terracotta data-[from=user]:text-warm-white",
          "data-[from=assistant]:bg-cream data-[from=assistant]:text-charcoal",
          "data-[from=system]:bg-sage/20 data-[from=system]:text-charcoal",
          className,
        )}
        data-from={props["data-from"]}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MessageContent.displayName = "MessageContent";

// Message response (text content)
type MessageResponseProps = ComponentProps<"div">;

export const MessageResponse = forwardRef<HTMLDivElement, MessageResponseProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("prose prose-sm max-w-none break-words", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
MessageResponse.displayName = "MessageResponse";

// Thinking indicator component
type ThinkingProps = ComponentProps<"div">;

export const Thinking = forwardRef<HTMLDivElement, ThinkingProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1 px-4 py-2", className)}
        {...props}
      >
        <span className="animation-delay-0 animate-bounce">●</span>
        <span className="animation-delay-150 animate-bounce">●</span>
        <span className="animation-delay-300 animate-bounce">●</span>
      </div>
    );
  },
);
Thinking.displayName = "Thinking";
