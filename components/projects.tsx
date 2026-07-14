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
      className="relative mx-auto w-full max-w-6xl px-6 py-32 md:px-10 md:py-48"
    >
      <div className="grid gap-16 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-20">
        {/* Left rail — the character presents the grid from beneath this. */}
        <div>
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
              Projects
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-6 font-display text-[clamp(3rem,7vw,6rem)] leading-none text-amber">
              {projects.length}
            </p>
            <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted">
              Public builds on GitHub — POS support tooling, hotel sites,
              Laravel apps.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="sweep mt-8 inline-block font-mono text-sm uppercase tracking-[0.2em] text-bone"
            >
              All repositories
            </a>
          </Reveal>
        </div>

        <ul className="grid gap-4 lg:grid-cols-2">
          {projects.map((project, i) => (
            <Reveal as="li" key={project.name} delay={(i % 2) * 120}>
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-line p-6 transition-colors duration-300 hover:border-amber/60 hover:bg-bone/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl leading-tight">
                    {project.name}
                  </h3>
                  <span className="mt-1 shrink-0 text-muted transition-colors duration-300 group-hover:text-amber">
                    <ArrowIcon />
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {project.description}
                </p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted"
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
