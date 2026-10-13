"use client";

import { cn } from "@/lib/utils";
import { isAbortError } from "@/lib/error-utils";
import { hapticLight } from "@/lib/haptics";
import { ChefHat, MapPin, MoreVertical, Trash2, Share2, Settings, ArrowLeft } from "lucide-react";
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
  readonly title?: string;
  readonly subtitle?: string;
  readonly locationEnabled?: boolean;
  readonly onBack?: () => void;
  readonly onClearChat?: () => void;
  readonly onSettings?: () => void;
  readonly className?: string;
  readonly scrollContainer?: HTMLElement | null;
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
}: Readonly<MobileChatHeaderProps>) {
  const [isCompact, setIsCompact] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    if (!scrollContainer) {
      return () => {};
    }

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
        if (!isAbortError(error)) {
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
        "sticky inset-bs-0 z-40 shrink-0 border-be border-rustic-sand/50 transition-all duration-300",
        "bg-linear-to-r from-rustic-cream via-rustic-blush/30 to-rustic-butter/40 backdrop-blur-lg",
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
            <ArrowLeft className="size-5" />
          </Button>
        )}

        {/* Logo/Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-linear-to-br from-rustic-terracotta to-rustic-terracotta/80 text-white shadow-lg shadow-rustic-terracotta/20 transition-all duration-300",
            isCompact ? "size-8 rounded-xl" : "size-10",
          )}
        >
          <ChefHat className={cn("transition-all duration-300", isCompact ? "size-4" : "size-5")} />
        </div>

        {/* Title area */}
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "truncate font-serif font-bold tracking-tight text-rustic-charcoal transition-all duration-300",
              isCompact ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h2>
          {!isCompact && <p className="truncate text-xs text-rustic-charcoal/50">{subtitle}</p>}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {locationEnabled && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full bg-rustic-moss/10 text-xs font-medium text-rustic-moss ring-1 ring-rustic-moss/20 transition-all duration-300",
                isCompact ? "px-2 py-0.5" : "px-2.5 py-1",
              )}
            >
              <MapPin className="size-3" />
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
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void handleShare()}>
                <Share2 className="me-2 size-4" />
                Share chat
              </DropdownMenuItem>
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="me-2 size-4" />
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
                    <Trash2 className="me-2 size-4" />
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
