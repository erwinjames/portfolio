"use client";

import { useEffect, useRef, useState } from "react";
import { jobs } from "@/lib/resume";

export function Experience() {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Whichever job is nearest the middle of the screen becomes the one in focus.
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let closest = 0;
      let smallest = Infinity;

      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - mid);
        if (distance < smallest) {
          smallest = distance;
          closest = i;
        }
      });

      setActive(closest);
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

  return (
    <section
      id="work"
      className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 md:px-10 md:py-44"
    >
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-20">
        {/* Sticky year — the "camera" that stays while the reel runs past it */}
        <div className="md:sticky md:top-0 md:h-screen md:pt-[38vh]">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-muted">
            <span className="text-amber">02</span>
            <span className="mx-2 opacity-30">/</span>
            Experience
          </p>
          <p
            key={jobs[active]?.year}
            className="mt-4 sm:mt-6 font-display text-[clamp(3.5rem,8vw,8rem)] leading-none text-amber font-semibold"
          >
            {jobs[active]?.year}
          </p>
          <p className="mt-2 sm:mt-4 max-w-xs text-sm font-medium leading-relaxed text-muted">
            {jobs[active]?.company}
          </p>
        </div>

        <ol className="space-y-24 sm:space-y-32 md:space-y-44">
          {jobs.map((job, i) => (
            <li
              key={job.company}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="job"
              data-active={active === i}
            >
              <div className="job-rule mb-6 sm:mb-8 h-px w-full bg-amber" />

              <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-muted">
                {job.period}
                {job.location ? ` · ${job.location}` : ""}
              </p>

              <h3 className="mt-3 font-display text-3xl sm:text-4xl font-semibold leading-tight text-bone md:text-5xl">
                {job.company}
              </h3>
              <p className="mt-2 text-base sm:text-lg font-semibold text-amber">{job.role}</p>

              <ul className="mt-6 sm:mt-8 space-y-3">
                {job.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 sm:gap-4 text-sm sm:text-base leading-relaxed text-muted font-normal"
                  >
                    <span
                      aria-hidden
                      className="mt-2.5 h-px w-4 shrink-0 bg-muted/60"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <ul className="mt-6 sm:mt-8 flex flex-wrap gap-2">
                {job.stack.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-full border border-line bg-white/90 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted shadow-xs"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
