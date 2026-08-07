"use client";

import { useEffect, useRef } from "react";
import { profile } from "@/lib/resume";

/** Splits a word into letters that rise into place, staggered. */
function RisingWord({ word, offset }: { word: string; offset: number }) {
  return (
    <span className="inline-block whitespace-nowrap">
      {word.split("").map((char, i) => (
        <span
          key={`${char}-${i}`}
          className="letter"
          style={
            { "--letter-delay": `${offset + i * 35}ms` } as React.CSSProperties
          }
        >
          {char}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const stageRef = useRef<HTMLElement>(null);

  // Drive a 0→1 progress var off scroll position so the hero "pushes back"
  // into the page as you leave it — the camera move.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const progress = Math.min(1, window.scrollY / window.innerHeight);
      el.style.setProperty("--p", progress.toFixed(4));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const words = profile.shortName.split(" ");

  return (
    <section
      ref={stageRef}
      id="top"
      className="hero-stage relative h-[135vh]"
      aria-label="Introduction"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* Warm key light behind the name */}
        <div
          className="hero-glow pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(217,154,78,0.55), transparent 65%)",
          }}
        />

        <div className="hero-camera relative mx-auto w-full max-w-6xl px-6 md:px-10">
          <p
            className="letter font-mono text-xs uppercase tracking-[0.35em] text-muted"
            style={{ "--letter-delay": "120ms" } as React.CSSProperties}
          >
            {profile.location}
          </p>

          <h1 className="mt-8 font-display text-[clamp(3rem,11vw,10rem)] leading-[0.9] tracking-tight">
            <RisingWord word={words[0] ?? ""} offset={280} />{" "}
            <span className="text-amber italic">
              <RisingWord word={words.slice(1).join(" ")} offset={430} />
            </span>
          </h1>

          <p
            className="letter mt-6 font-mono text-xs uppercase tracking-[0.3em] text-amber"
            style={{ "--letter-delay": "700ms" } as React.CSSProperties}
          >
            {profile.role}
          </p>

          {/* Kept in a single left-hand column: the character travels through
              the right half of the hero and must not fight the copy. */}
          <div className="mt-8 flex max-w-md flex-col items-start gap-8">
            <p
              className="letter text-lg leading-relaxed text-muted"
              style={{ "--letter-delay": "820ms" } as React.CSSProperties}
            >
              {profile.tagline} Web developer and systems administrator, seven
              years in.
            </p>

            <a
              href="#contact"
              className="letter sweep font-mono text-sm uppercase tracking-[0.2em] text-bone"
              style={{ "--letter-delay": "980ms" } as React.CSSProperties}
            >
              Get in touch
            </a>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="letter absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-muted"
          style={{ "--letter-delay": "1300ms" } as React.CSSProperties}
        >
          Scroll
        </div>
      </div>
    </section>
  );
}
