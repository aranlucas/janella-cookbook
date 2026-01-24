"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RecipeImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  fallback?: string; // Fallback image URL
  fallbackEmoji?: string;
}

/**
 * Enhanced recipe image component with fallback handling
 * Built on top of ImageWithFallback with additional features:
 * - Loading states with skeleton animation
 * - Emoji fallback when no image source or all images fail
 * - Custom container styling
 */
export function RecipeImage({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  containerClassName,
  fallbackEmoji = "🍽️",
}: RecipeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiFallback, setShowEmojiFallback] = useState(false);

  // Show emoji fallback if no src provided or if all images failed
  if (!src || showEmojiFallback) {
    return (
      <div
        className={cn(
          "bg-butter/30 flex items-center justify-center",
          fill && "absolute inset-0",
          containerClassName,
        )}
        style={!fill ? { width, height } : undefined}
      >
        <span className="text-6xl opacity-30 md:text-8xl">{fallbackEmoji}</span>
      </div>
    );
  }

  // Handle case where image fails (after trying unoptimized)
  const handleImageError = () => {
    setShowEmojiFallback(true);
    setIsLoading(false);
  };

  // For fill mode (most common use case)
  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden", containerClassName)}
      >
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            className,
          )}
          onLoad={() => setIsLoading(false)}
          onError={handleImageError}
        />
        {isLoading && (
          <div className="bg-butter/30 absolute inset-0 animate-pulse" />
        )}
      </div>
    );
  }

  // For fixed dimensions
  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <img
        src={src}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoad={() => setIsLoading(false)}
        onError={handleImageError}
      />
      {isLoading && (
        <div
          className="bg-butter/30 absolute inset-0 animate-pulse"
          style={{ width, height }}
        />
      )}
    </div>
  );
}
