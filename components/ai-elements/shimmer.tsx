"use client";

import type { MotionProps } from "motion/react";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

const motionComponents = {
  div: motion.div,
  p: motion.p,
  span: motion.span,
} as const;

type ShimmerElement = keyof typeof motionComponents;

type ShimmerStyle = NonNullable<MotionProps["style"]> & {
  readonly "--bg": string;
  readonly "--spread": string;
};

export interface TextShimmerProps {
  readonly children: string;
  readonly as?: ShimmerElement;
  readonly className?: string;
  readonly duration?: number;
  readonly spread?: number;
}

const ShimmerComponent = ({
  children,
  as: element = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = motionComponents[element];

  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);

  const style: ShimmerStyle = {
    "--bg":
      "linear-gradient(90deg,#0000 calc(50%-var(--spread)),var(--color-background),#0000 calc(50%+var(--spread)))",
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
    backgroundRepeat: "no-repeat, padding-box",
    backgroundSize: "250% 100%, auto",
  };

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn("relative inline-block bg-clip-text text-transparent", className)}
      initial={{ backgroundPosition: "100% center" }}
      style={style}
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
