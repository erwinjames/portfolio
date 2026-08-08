"use client";

import { useEffect, useState } from "react";
import { profile } from "@/lib/resume";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

export function Nav() {
  const [lifted, setLifted] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Fade the bar in only once the hero has started moving away.
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setLifted(window.scrollY > window.innerHeight * 0.6);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-70 transition-opacity duration-700 ${
        lifted ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Scrim so section text scrolling underneath doesn't collide with the bar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 backdrop-blur-md border-b border-line/40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(250, 249, 246, 0.92), rgba(250, 249, 246, 0.8))",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 md:px-10">
        {/* The wordmark on desktop/tablet */}
        <a
          href="#top"
          className="hidden font-mono text-xs font-semibold uppercase tracking-[0.25em] whitespace-nowrap text-bone sm:block"
        >
          {profile.shortName}
        </a>

        <nav className="w-full sm:w-auto overflow-x-auto py-1 scrollbar-none">
          <ul className="flex items-center justify-between gap-3 sm:gap-6 md:gap-8 whitespace-nowrap">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`font-mono text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                    active === section.id
                      ? "text-amber font-bold"
                      : "text-muted hover:text-bone"
                  }`}
                  aria-current={active === section.id ? "true" : undefined}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
