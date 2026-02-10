"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildRecipeImageCandidates } from "@/lib/image-url";
import { cn } from "@/lib/utils";

const BLUR_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12'%3E%3Crect width='16' height='12' fill='%23e8ddd4'/%3E%3C/svg%3E";

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
  fallback?: string;
  fallbackEmoji?: string;
}

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
  const imageCandidates = useMemo(() => {
    const primaryCandidates = buildRecipeImageCandidates(src);
    const fallbackCandidates = fallback
      ? buildRecipeImageCandidates(fallback)
      : [];

    return [...new Set([...primaryCandidates, ...fallbackCandidates])];
  }, [src, fallback]);

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

  useEffect(() => {
    if (!currentSrc || showEmojiFallback || !isLoading) return;

    const timeout = window.setTimeout(() => {
      tryNextCandidate();
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [currentSrc, isLoading, showEmojiFallback, tryNextCandidate]);

  if (!currentSrc || showEmojiFallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30",
          fill && "absolute inset-0",
          containerClassName,
        )}
        style={!fill ? { width, height } : undefined}
      >
        <span className="text-6xl opacity-30 md:text-8xl">{fallbackEmoji}</span>
      </div>
    );
  }

  const baseImageClass = cn(
    "object-cover transition-opacity duration-300",
    isLoading ? "opacity-0" : "opacity-100",
    className,
  );

  const handleLoad = () => setIsLoading(false);
  const handleError = () => tryNextCandidate();

  if (fill) {
    return (
      <div
        className={cn("absolute inset-0 overflow-hidden", containerClassName)}
      >
        <Image
          src={currentSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          referrerPolicy="no-referrer"
          className={baseImageClass}
          onLoad={handleLoad}
          onError={handleError}
        />
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-muted/30" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <Image
        src={currentSrc}
        alt={alt}
        width={width || 400}
        height={height || 300}
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        referrerPolicy="no-referrer"
        className={cn("h-full w-full", baseImageClass)}
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted/30" />
      )}
    </div>
  );
}
