"use client";

import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";
import {
  ChefHat,
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
  title = "Janella's Kitchen Assistant",
  subtitle = "Your personal cooking companion",
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
          title: "Janella's Kitchen Assistant",
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
        "border-rustic-sand/50 sticky top-0 z-40 shrink-0 border-b transition-all duration-300",
        "from-rustic-cream via-rustic-blush/30 to-rustic-butter/40 bg-gradient-to-r backdrop-blur-lg",
        isCompact ? "py-2" : "py-3",
        !isVisible && "-translate-y-full",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4">
        {/* Back button (mobile) */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="text-rustic-charcoal/60 hover:text-rustic-charcoal md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Icon */}
        <div
          className={cn(
            "from-rustic-terracotta to-rustic-terracotta/80 shadow-rustic-terracotta/20 flex items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300",
            isCompact ? "h-8 w-8 rounded-xl" : "h-10 w-10",
          )}
        >
          <ChefHat
            className={cn(
              "transition-all duration-300",
              isCompact ? "h-4 w-4" : "h-5 w-5",
            )}
          />
        </div>

        {/* Title area */}
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "text-rustic-charcoal truncate font-serif font-bold tracking-tight transition-all duration-300",
              isCompact ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h2>
          {!isCompact && (
            <p className="text-rustic-charcoal/50 truncate text-xs">
              {subtitle}
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {locationEnabled && (
            <div
              className={cn(
                "bg-rustic-moss/10 text-rustic-moss ring-rustic-moss/20 flex items-center gap-1.5 rounded-full text-xs font-medium ring-1 transition-all duration-300",
                isCompact ? "px-2 py-0.5" : "px-2.5 py-1",
              )}
            >
              <MapPin className="h-3 w-3" />
              {!isCompact && <span>Location on</span>}
            </div>
          )}

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-rustic-charcoal/50 hover:bg-rustic-blush/30 hover:text-rustic-charcoal"
                  aria-label="More options"
                />
              }
            >
              <MoreVertical className="h-5 w-5" />
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
