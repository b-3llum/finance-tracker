"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
  delay?: number;
}

export function FloatingCard({
  children,
  className,
  direction = "left",
  delay = 0,
}: FloatingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const offsetX = direction === "left" ? -60 : 60;

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, translateX: offsetX }}
      animate={
        isInView
          ? { opacity: 1, translateX: 0 }
          : { opacity: 0, translateX: offsetX }
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
