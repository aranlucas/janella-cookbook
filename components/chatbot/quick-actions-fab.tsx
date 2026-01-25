"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import {
  Plus,
  X,
  Camera,
  Utensils,
  Clock,
  ShoppingCart,
  Leaf,
  ChefHat,
} from "lucide-react";
import { useState, useCallback } from "react";

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "quick-dinner",
    icon: <Clock className="h-4 w-4" />,
    label: "Quick dinner",
    prompt: "What's a quick dinner I can make in under 30 minutes?",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    id: "healthy",
    icon: <Leaf className="h-4 w-4" />,
    label: "Healthy meal",
    prompt: "Suggest a healthy and nutritious meal for tonight",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    id: "shopping",
    icon: <ShoppingCart className="h-4 w-4" />,
    label: "Shopping list",
    prompt: "Help me create a shopping list for the week",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    id: "technique",
    icon: <ChefHat className="h-4 w-4" />,
    label: "Cooking tip",
    prompt: "Share a professional cooking technique I should learn",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    id: "leftovers",
    icon: <Utensils className="h-4 w-4" />,
    label: "Use leftovers",
    prompt: "What can I make with common leftover ingredients?",
    color: "bg-rose-500 hover:bg-rose-600",
  },
];

interface QuickActionsFabProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickActionsFab({
  onSelectAction,
  disabled,
  className,
}: QuickActionsFabProps) {
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
    <div className={cn("fixed right-4 bottom-24 z-50 md:hidden", className)}>
      {/* Action buttons */}
      <div
        className={cn(
          "mb-2 flex flex-col-reverse gap-2 transition-all duration-300",
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
            <span className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium whitespace-nowrap text-stone-700 shadow-md backdrop-blur-sm">
              {action.label}
            </span>
            <Button
              type="button"
              size="icon"
              disabled={disabled}
              onClick={() => handleActionClick(action)}
              className={cn(
                "h-10 w-10 rounded-full text-white shadow-lg transition-transform active:scale-95",
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
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
          isOpen
            ? "rotate-45 bg-stone-600 hover:bg-stone-700"
            : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
        )}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
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
  onCapture: () => void;
  disabled?: boolean;
  className?: string;
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
        "fixed bottom-24 left-4 z-50 md:hidden",
        "h-12 w-12 rounded-full shadow-lg",
        "bg-stone-800 text-white hover:bg-stone-900",
        "transition-transform active:scale-95",
        className,
      )}
      aria-label="Take photo of recipe"
    >
      <Camera className="h-5 w-5" />
    </Button>
  );
}
