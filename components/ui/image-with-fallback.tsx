"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";

interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback?: string;
}

export const ImageWithFallback = ({
  fallback = "https://placehold.co/600x400/f5f1e8/4a4a4a?text=No+Image",
  alt,
  src,
  ...props
}: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  return (
    <Image
      alt={alt}
      onError={() => setError(true)}
      src={error ? fallback : src}
      {...props}
    />
  );
};
