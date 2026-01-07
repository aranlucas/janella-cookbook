"use client";

import { useState, useEffect } from "react";
import { ImageWithFallback } from "./image-with-fallback";
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
  priority = false,
  className,
  containerClassName,
  fallback,
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

  // Use emoji as final fallback if no fallback image provided
  const finalFallback = fallback || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f5f1e8' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='64' opacity='0.3'%3E${fallbackEmoji}%3C/text%3E%3C/svg%3E`;

  // Handle case where both primary and fallback images fail
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
        <ImageWithFallback
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          fallback={finalFallback}
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
      <ImageWithFallback
        src={src}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        priority={priority}
        fallback={finalFallback}
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
