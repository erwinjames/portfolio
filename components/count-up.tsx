"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** e.g. "7", "100%" — any leading digits are counted, the rest is kept. */
  value: string;
  className?: string;
};

/** Ease-out cubic: fast off the mark, settling gently. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const DURATION = 1400;

/**
 * Counts a number up the first time it scrolls into view. Any non-numeric
 * suffix ("%") is preserved.
 */
export function CountUp({ value, className = "" }: CountUpProps) {
  // Derived to PRIMITIVES on purpose. An earlier version kept the RegExp match
  // array itself and listed it in the effect's deps — a fresh array every
  // render, so the effect tore down and restarted on every animation tick,
  // cancelling its own rAF. The counter sat at 0 forever.
  const match = /^(\d+)(.*)$/.exec(value);
  const targetNum = match ? Number(match[1]) : 0;
  const suffix = match ? match[2] : "";
  const isNumeric = match !== null;

  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isNumeric) return;

    let raf = 0;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Deferred a frame: setting state synchronously in an effect body
      // cascades renders.
      raf = requestAnimationFrame(() => setCount(targetNum));
      return () => cancelAnimationFrame(raf);
    }

    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      setCount(Math.round(easeOut(t) * targetNum));
      if (t < 1) raf = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            raf = requestAnimationFrame(step);
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [isNumeric, targetNum]);

  return (
    <span ref={ref} className={className}>
      {isNumeric ? `${count}${suffix}` : value}
    </span>
  );
}
