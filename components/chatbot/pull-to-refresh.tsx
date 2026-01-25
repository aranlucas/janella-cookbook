"use client";

import { cn } from "@/lib/utils";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { RefreshCw, Loader2 } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  pullThreshold?: number;
  maxPull?: number;
  refreshMessage?: string;
  releaseMessage?: string;
  pullMessage?: string;
}

type RefreshState = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh({
  children,
  onRefresh,
  className,
  pullThreshold = 80,
  maxPull = 120,
  refreshMessage = "Refreshing...",
  releaseMessage = "Release to refresh",
  pullMessage = "Pull to refresh",
}: PullToRefreshProps) {
  const [state, setState] = useState<RefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const container = containerRef.current;
      if (!container || state === "refreshing") return;

      // Only allow pull if at top of scroll
      if (container.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [state]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || state === "refreshing") return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        setState("idle");
        return;
      }

      const touchY = e.touches[0].clientY;
      const delta = touchY - touchStartY.current;

      if (delta > 0) {
        // Apply resistance to pull
        const resistance = 0.4;
        const distance = Math.min(delta * resistance, maxPull);
        setPullDistance(distance);

        if (distance >= pullThreshold) {
          if (state !== "ready") {
            hapticMedium();
            setState("ready");
          }
        } else {
          setState("pulling");
        }

        // Prevent default scroll when pulling
        if (delta > 10) {
          e.preventDefault();
        }
      }
    },
    [state, pullThreshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (state === "ready") {
      setState("refreshing");
      hapticSuccess();

      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }

      setState("idle");
      setPullDistance(0);
    } else {
      setState("idle");
      setPullDistance(0);
    }
  }, [state, onRefresh]);

  // Reset pull on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop > 0 && state === "pulling") {
        isPulling.current = false;
        setPullDistance(0);
        setState("idle");
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [state]);

  const getMessage = () => {
    switch (state) {
      case "refreshing":
        return refreshMessage;
      case "ready":
        return releaseMessage;
      default:
        return pullMessage;
    }
  };

  const showIndicator = state !== "idle" || pullDistance > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 top-0 flex items-center justify-center transition-all duration-200 z-10",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: pullDistance,
          transform: `translateY(${state === "refreshing" ? 0 : -pullDistance / 2}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-1 py-2">
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-white shadow-md transition-all duration-200",
              state === "refreshing" ? "h-10 w-10" : "h-8 w-8"
            )}
            style={{
              transform:
                state === "refreshing"
                  ? "rotate(0deg)"
                  : `rotate(${(pullDistance / maxPull) * 360}deg)`,
            }}
          >
            {state === "refreshing" ? (
              <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
            ) : (
              <RefreshCw
                className={cn(
                  "h-4 w-4 transition-colors",
                  state === "ready" ? "text-orange-500" : "text-stone-400"
                )}
              />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-medium transition-colors",
              state === "ready" ? "text-orange-600" : "text-stone-500"
            )}
          >
            {getMessage()}
          </span>
        </div>
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="h-full overflow-y-auto"
        style={{
          transform:
            state === "refreshing"
              ? `translateY(${pullThreshold}px)`
              : `translateY(${pullDistance}px)`,
          transition:
            state === "refreshing" || state === "idle"
              ? "transform 0.2s ease-out"
              : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
