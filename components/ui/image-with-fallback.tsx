"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "onError"> {
  src: string;
  fallback?: string;
  onError?: () => void;
}

export const ImageWithFallback = ({
  fallback = "https://placehold.co/600x400/f5f1e8/4a4a4a?text=No+Image",
  alt,
  src,
  onError,
  ...props
}: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setError(false);
    setCurrentSrc(src);
  }, [src]);

  const handleError = () => {
    if (!error && currentSrc === src && fallback) {
      // First error: try fallback
      setError(true);
      setCurrentSrc(fallback);
    } else if (onError) {
      // Fallback also failed or no fallback: call parent's onError handler
      onError();
    }
  };

  return (
    <Image
      alt={alt}
      onError={handleError}
      src={currentSrc}
      {...props}
    />
  );
};
