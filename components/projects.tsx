import { Reveal } from "@/components/reveal";
import { profile, projects } from "@/lib/resume";

/** External-link arrow. SVG rather than a glyph so it renders identically
 *  everywhere and can transition with the card hover. */
function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function Projects() {
  return (
    <section
      id="projects"
      className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 md:px-10 md:py-44"
    >
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-20">
        {/* Left rail — the character presents the grid from beneath this. */}
        <div>
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-muted">
              <span className="text-amber">03</span>
              <span className="mx-2 opacity-30">/</span>
              Projects
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-4 sm:mt-6 font-display text-[clamp(2.5rem,6vw,6rem)] leading-none text-amber font-semibold">
              {projects.length}
            </p>
            <p className="mt-3 max-w-[16rem] text-sm font-medium leading-relaxed text-muted">
              Public builds on GitHub — POS support tooling, hotel sites,
              Laravel apps.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber transition-colors hover:text-amber/80 hover:underline"
            >
              All repositories →
            </a>
          </Reveal>
        </div>

        <ul className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {projects.map((project, i) => (
            <Reveal as="li" key={project.name} delay={(i % 2) * 120}>
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl border border-line/60 bg-white/80 backdrop-blur-xs p-6 sm:p-7 transition-all duration-300 hover:border-amber/80 hover:bg-white hover:shadow-[0_12px_32px_-8px_rgba(217,119,6,0.18)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-xl sm:text-2xl font-semibold leading-tight text-bone">
                    {project.name}
                  </h3>
                  <span className="mt-1 shrink-0 text-muted transition-colors duration-300 group-hover:text-amber">
                    <ArrowIcon />
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm font-normal leading-relaxed text-muted">
                  {project.description}
                </p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full border border-line/70 bg-white px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted shadow-2xs"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
