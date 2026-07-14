"use client";

import { useEffect, useState } from "react";

/**
 * A curtain that holds the page for a beat, draws a hairline across, then lifts
 * away. It exists to give the hero a moment of anticipation before it lands —
 * the difference between a page that loads and a page that opens.
 *
 * Skipped entirely under prefers-reduced-motion: no curtain, no delay.
 */
export function Intro() {
  const [lifted, setLifted] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Deferred a frame: setting state synchronously in an effect body
      // cascades renders.
      const raf = requestAnimationFrame(() => setGone(true));
      return () => cancelAnimationFrame(raf);
    }

    // The page must not be scrollable while the curtain is up, or a stray
    // wheel event scrolls content we're covering.
    document.body.style.overflow = "hidden";

    const lift = window.setTimeout(() => setLifted(true), 1150);
    const clear = window.setTimeout(() => {
      setGone(true);
      document.body.style.overflow = "";
    }, 2350);

    return () => {
      window.clearTimeout(lift);
      window.clearTimeout(clear);
      document.body.style.overflow = "";
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-90 flex items-center justify-center bg-ink transition-[transform,opacity] duration-[1200ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        lifted ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      {/* A rule that draws itself out from the centre. */}
      <div className="relative h-px w-[min(38rem,70vw)] overflow-hidden bg-line">
        <div className="intro-rule absolute inset-y-0 left-0 bg-amber" />
      </div>
    </div>
  );
}
