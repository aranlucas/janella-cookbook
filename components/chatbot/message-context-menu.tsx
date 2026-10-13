"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { isAbortError } from "@/lib/error-utils";
import { Copy, Share2, RefreshCw, Bookmark, Flag } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface MessageContextMenuProps {
  readonly children: ReactNode;
  readonly messageContent: string;
  readonly messageRole: "user" | "assistant";
  readonly onRegenerate?: () => void;
  readonly onBookmark?: () => void;
  readonly onReport?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

export function MessageContextMenu({
  children,
  messageContent,
  messageRole,
  onRegenerate,
  onBookmark,
  onReport,
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<TouchPoint | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      hapticSuccess();
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [messageContent]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Recipe Chat",
          text: messageContent,
        });
        hapticSuccess();
      } catch (error) {
        // User cancelled or share failed
        if (!isAbortError(error)) {
          toast.error("Failed to share");
        }
      }
    } else {
      // Fallback to copy
      await handleCopy();
    }
  }, [messageContent, handleCopy]);

  // Long press detection for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    longPressTimer.current = setTimeout(() => {
      hapticMedium();
      setIsOpen(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) {
      return;
    }

    const moveThreshold = 10;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

    if (dx > moveThreshold || dy > moveThreshold) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    touchStartPos.current = null;
  }, []);

  return (
    <ContextMenu open={isOpen} onOpenChange={setIsOpen}>
      <ContextMenuTrigger
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="touch-pan-y"
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => void handleCopy()}>
          <Copy className="me-2 size-4" />
          Copy text
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void handleShare()}>
          <Share2 className="me-2 size-4" />
          Share
        </ContextMenuItem>

        {messageRole === "assistant" && onRegenerate && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onRegenerate}>
              <RefreshCw className="me-2 size-4" />
              Regenerate response
            </ContextMenuItem>
          </>
        )}

        {onBookmark && (
          <ContextMenuItem onClick={onBookmark}>
            <Bookmark className="me-2 size-4" />
            Save to favorites
          </ContextMenuItem>
        )}

        {messageRole === "assistant" && onReport && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onReport} className="text-red-600">
              <Flag className="me-2 size-4" />
              Report issue
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
