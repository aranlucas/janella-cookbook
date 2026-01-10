"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "onError"> {
  src: string;
  fallback?: string;
  onError?: () => void;
}

export const ImageWithFallback = ({
  fallback,
  alt,
  src,
  onError,
  ...props
}: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    if (error) {
      setError(false);
    }
  }, [src, error]);

  const handleError = () => {
    if (!error) {
      setError(true);
    } else if (onError) {
      // Both original and fallback failed
      onError();
    }
  };

  // Use fallback (or original src as fallback) with unoptimized flag
  const imageSrc = error ? fallback || src : src;
  const isUnoptimized = error;

  return (
    <Image
      alt={alt}
      onError={handleError}
      src={imageSrc}
      unoptimized={isUnoptimized}
      {...props}
    />
  );
};
