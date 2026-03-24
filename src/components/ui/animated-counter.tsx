"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  useInView,
  useMotionValue,
  useTransform,
  animate,
  motion,
} from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1.5,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState("0");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value.toLocaleString());
      return;
    }

    if (!isInView) return;

    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });

    const unsubscribe = rounded.on("change", (latest) => {
      setDisplay(latest.toLocaleString());
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [isInView, value, duration, motionValue, rounded, prefersReducedMotion]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
}
