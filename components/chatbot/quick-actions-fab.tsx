"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { Plus, X, Camera } from "lucide-react";
import { useState, useCallback } from "react";
import type { QuickAction } from "@/components/chatbot/quick-actions";
import { quickActions } from "@/components/chatbot/quick-actions";

interface QuickActionsFabProps {
  readonly onSelectAction: (prompt: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function QuickActionsFab({ onSelectAction, disabled, className }: QuickActionsFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    hapticMedium();
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback(
    (action: QuickAction) => {
      hapticLight();
      onSelectAction(action.prompt);
      setIsOpen(false);
    },
    [onSelectAction],
  );

  return (
    <div className={cn("fixed inset-e-4 inset-be-52 z-50 md:hidden", className)}>
      {/* Action buttons */}
      <div
        className={cn(
          "mbe-2 flex flex-col-reverse gap-2 transition-all duration-300",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {quickActions.map((action, index) => (
          <div
            key={action.id}
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
            )}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
            }}
          >
            <span className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium whitespace-nowrap text-rustic-charcoal shadow-md backdrop-blur-sm">
              {action.label}
            </span>
            <Button
              type="button"
              size="icon"
              disabled={disabled}
              onClick={() => handleActionClick(action)}
              className={cn(
                "size-10 rounded-full text-white shadow-lg transition-transform active:scale-95",
                action.color,
              )}
              aria-label={action.label}
            >
              {action.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        type="button"
        size="icon"
        onClick={toggleOpen}
        disabled={disabled}
        className={cn(
          "size-14 rounded-full shadow-xl transition-all duration-300",
          isOpen
            ? "rotate-45 bg-rustic-charcoal hover:bg-rustic-charcoal/90"
            : "bg-linear-to-br from-rustic-terracotta to-rustic-terracotta/80 hover:from-rustic-terracotta/95 hover:to-rustic-terracotta/75",
        )}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="size-6 text-white" /> : <Plus className="size-6 text-white" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10 bg-black/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// Camera FAB for quick photo capture
interface CameraFabProps {
  readonly onCapture: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function CameraFab({ onCapture, disabled, className }: CameraFabProps) {
  const handleClick = useCallback(() => {
    hapticMedium();
    onCapture();
  }, [onCapture]);

  return (
    <Button
      type="button"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "fixed inset-s-4 inset-be-52 z-50 md:hidden",
        "size-12 rounded-full shadow-lg",
        "bg-rustic-charcoal text-white hover:bg-rustic-charcoal/90",
        "transition-transform active:scale-95",
        className,
      )}
      aria-label="Take photo of recipe"
    >
      <Camera className="size-5" />
    </Button>
  );
}
