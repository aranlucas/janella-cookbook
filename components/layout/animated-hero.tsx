"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

// Floating food emojis that drift around the hero
const floatingFoods = [
  { emoji: "🍊", x: "8%", y: "18%", size: "text-2xl sm:text-3xl", delay: 0 },
  {
    emoji: "🌿",
    x: "85%",
    y: "22%",
    size: "text-xl sm:text-2xl",
    delay: 0.8,
  },
  {
    emoji: "🍋",
    x: "75%",
    y: "70%",
    size: "text-2xl sm:text-3xl",
    delay: 1.6,
  },
  {
    emoji: "🧄",
    x: "12%",
    y: "65%",
    size: "text-lg sm:text-xl",
    delay: 2.4,
  },
  {
    emoji: "🫒",
    x: "92%",
    y: "48%",
    size: "text-lg sm:text-xl",
    delay: 0.4,
  },
  {
    emoji: "🌶️",
    x: "5%",
    y: "42%",
    size: "text-xl sm:text-2xl",
    delay: 1.2,
  },
];

export function FloatingEmojis() {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {floatingFoods.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute select-none ${item.size}`}
          style={{ left: item.x, top: item.y, opacity: 0 }}
          animate={{
            opacity: 0.18,
            scale: 1,
            y: [0, -14, 0, -8, 0],
            rotate: [0, 4, -3, 2, 0],
          }}
          transition={{
            opacity: { duration: 0.6, delay: item.delay },
            scale: { duration: 0.5, delay: item.delay, type: "spring" },
            y: {
              duration: 5 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            },
            rotate: {
              duration: 6 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            },
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// Animated heading text with a wave/bounce entrance
export function AnimatedHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.h1
      className={className}
      style={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {children}
    </motion.h1>
  );
}

// Animated underline SVG with draw-on effect
export function AnimatedUnderline() {
  return (
    <motion.svg
      className="absolute -right-3 -bottom-1.5 h-2.5 w-10 text-[var(--highlight)] sm:-right-4 sm:-bottom-2 sm:h-3 sm:w-12"
      viewBox="0 0 48 12"
      fill="none"
      style={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
    >
      <motion.path
        d="M2 8C12 4 36 2 46 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

// Subtitle with stagger entrance
export function AnimatedSubtitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      className={className}
      style={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.3,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.p>
  );
}

// Animated badge with pop-in
export function AnimatedBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      style={{ opacity: 0, scale: 0.6, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 15,
      }}
    >
      {children}
    </motion.span>
  );
}

// Animated search area entrance
export function AnimatedSearchArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      style={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.4,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// Bouncy tag pill with individual spring animation
export function AnimatedTagPill({
  children,
  index,
  href,
  className,
}: {
  children: ReactNode;
  index: number;
  href: string;
  className?: string;
}) {
  return (
    <motion.div
      className="inline-block"
      style={{ opacity: 0, y: 12, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: 0.6 + index * 0.08,
        type: "spring",
        stiffness: 400,
        damping: 17,
      }}
      whileHover={{
        scale: 1.1,
        y: -2,
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.93,
        transition: { duration: 0.1 },
      }}
    >
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

// Section reveal animation
export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.section>
  );
}
