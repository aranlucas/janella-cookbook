"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildRecipeImageCandidates } from "@/lib/image-url";
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
  fallbackEmoji = "🍽️",
}: RecipeImageProps) {
  const imageCandidates = useMemo(() => buildRecipeImageCandidates(src), [src]);
  const sourceKey = imageCandidates.join("|") || "__empty__";

  return (
    <RecipeImageRenderer
      key={sourceKey}
      imageCandidates={imageCandidates}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      containerClassName={containerClassName}
      fallbackEmoji={fallbackEmoji}
    />
  );
}

interface RecipeImageRendererProps {
  imageCandidates: string[];
  alt: string;
  fill: boolean;
  width?: number;
  height?: number;
  sizes: string;
  priority: boolean;
  className?: string;
  containerClassName?: string;
  fallbackEmoji: string;
}

function RecipeImageRenderer({
  imageCandidates,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
  containerClassName,
  fallbackEmoji,
}: RecipeImageRendererProps) {
  const [isLoading, setIsLoading] = useState(imageCandidates.length > 0);
  const [showEmojiFallback, setShowEmojiFallback] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentSrc = imageCandidates[candidateIndex];

  const tryNextCandidate = useCallback(() => {
    setCandidateIndex((currentIndex) => {
      const nextIndex = currentIndex + 1;

      if (nextIndex < imageCandidates.length) {
        setIsLoading(true);
        return nextIndex;
      }

      setShowEmojiFallback(true);
      setIsLoading(false);
      return currentIndex;
    });
  }, [imageCandidates.length]);

  // Some blocked external requests never fire onError; advance automatically.
  useEffect(() => {
    if (!currentSrc || showEmojiFallback || !isLoading) return;

    const timeout = window.setTimeout(() => {
      tryNextCandidate();
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [currentSrc, isLoading, showEmojiFallback, tryNextCandidate]);

  // Show emoji fallback if no src provided or if all images failed
  if (!currentSrc || showEmojiFallback) {
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
    tryNextCandidate();
  };

  // For fill mode (most common use case)
  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden", containerClassName)}
      >
        <img
          src={currentSrc}
          alt={alt}
          sizes={sizes}
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
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
        src={currentSrc}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        referrerPolicy="no-referrer"
        loading={priority ? "eager" : "lazy"}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
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
