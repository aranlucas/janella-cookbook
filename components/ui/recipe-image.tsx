"use client";

import { useState } from "react";
import Image from "next/image";
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
  fallbackEmoji?: string;
}

/**
 * Optimized recipe image component with fallback handling
 * Uses Next.js Image for automatic optimization, lazy loading, and responsive sizing
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
  fallbackEmoji = "🍽️",
}: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Show fallback if no src or if image failed to load
  if (!src || hasError) {
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

  // For fill mode (most common use case)
  // Container uses absolute positioning to fill parent - parent MUST have position:relative and defined dimensions
  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden", containerClassName)}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            className,
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
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
      <Image
        src={src}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        priority={priority}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
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
