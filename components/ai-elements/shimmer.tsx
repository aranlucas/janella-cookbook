"use client";

import { cn } from "@/lib/utils";
import { motion, type MotionProps } from "motion/react";
import { type CSSProperties, memo, useMemo } from "react";

export interface TextShimmerProps {
  children: string;
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  duration?: number;
  spread?: number;
}

// Pre-created motion components to satisfy React purity rules
const MotionP = motion.p;
const MotionSpan = motion.span;
const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionH2 = motion.h2;
const MotionH3 = motion.h3;
const MotionH4 = motion.h4;
const MotionH5 = motion.h5;
const MotionH6 = motion.h6;

// Map of tag names to pre-created motion components
const motionComponents = {
  p: MotionP,
  span: MotionSpan,
  div: MotionDiv,
  h1: MotionH1,
  h2: MotionH2,
  h3: MotionH3,
  h4: MotionH4,
  h5: MotionH5,
  h6: MotionH6,
} as const;

type ShimmerMotionProps = MotionProps & {
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
};

const ShimmerComponent = ({
  children,
  as = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = motionComponents[
    as
  ] as React.ComponentType<ShimmerMotionProps>;

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  );

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
