"use client";

import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";
import {
  UtensilsCrossed,
  MapPin,
  MoreVertical,
  Trash2,
  Share2,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface MobileChatHeaderProps {
  title?: string;
  subtitle?: string;
  locationEnabled?: boolean;
  onBack?: () => void;
  onClearChat?: () => void;
  onSettings?: () => void;
  className?: string;
  scrollContainer?: HTMLElement | null;
}

export function MobileChatHeader({
  title = "AI Cooking Assistant",
  subtitle = "Powered by Janella Cookbook",
  locationEnabled,
  onBack,
  onClearChat,
  onSettings,
  className,
  scrollContainer,
}: MobileChatHeaderProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY;

      // Compact mode when scrolled past threshold
      setIsCompact(currentScrollY > 60);

      // Hide/show based on scroll direction
      if (scrollDelta > 10 && currentScrollY > 100) {
        setIsVisible(false);
      } else if (scrollDelta < -10 || currentScrollY < 50) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollContainer, lastScrollY]);

  const handleShare = useCallback(async () => {
    hapticLight();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Cooking Assistant",
          text: "Check out this AI cooking assistant!",
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  }, []);

  const handleClearChat = useCallback(() => {
    hapticLight();
    onClearChat?.();
  }, [onClearChat]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b border-stone-200 transition-all duration-300",
        "bg-gradient-to-r from-stone-50 to-orange-50 backdrop-blur-lg",
        isCompact ? "py-2" : "py-4",
        !isVisible && "-translate-y-full",
        className
      )}
    >
      <div className="flex items-center gap-3 px-4">
        {/* Back button (mobile) */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="md:hidden text-stone-600 hover:text-stone-900"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md transition-all duration-300",
            isCompact ? "h-8 w-8" : "h-12 w-12"
          )}
        >
          <UtensilsCrossed
            className={cn(
              "transition-all duration-300",
              isCompact ? "h-4 w-4" : "h-6 w-6"
            )}
          />
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <h2
            className={cn(
              "font-bold tracking-tight text-stone-800 truncate transition-all duration-300",
              isCompact ? "text-base" : "text-xl"
            )}
          >
            {title}
          </h2>
          {!isCompact && (
            <p className="text-sm text-stone-500 truncate">{subtitle}</p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {locationEnabled && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-green-100 text-xs font-medium text-green-700 transition-all duration-300",
                isCompact ? "px-2 py-0.5" : "px-3 py-1"
              )}
            >
              <MapPin className="h-3 w-3" />
              {!isCompact && <span>Location on</span>}
            </div>
          )}

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-stone-600 hover:text-stone-900"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share chat
              </DropdownMenuItem>
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              {onClearChat && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleClearChat}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear chat
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
