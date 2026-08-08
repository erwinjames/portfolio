import { Reveal } from "@/components/reveal";
import { education, marqueeSkills, skillGroups } from "@/lib/resume";

/** One infinite-scrolling band of skill names. Content is duplicated so the
 *  -50% translate loops seamlessly. */
function Band({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="marquee-mask overflow-hidden py-3">
      <div className={`marquee ${reverse ? "marquee-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex">
            {marqueeSkills.map((skill) => (
              <span
                key={`${copy}-${skill}`}
                className="flex items-center gap-6 sm:gap-8 px-6 sm:px-8 font-display text-3xl sm:text-4xl text-muted font-medium md:text-6xl"
              >
                {skill}
                <span className="text-amber">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="relative py-24 sm:py-32 md:py-44">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10">
        <Reveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-muted">
            <span className="text-amber">04</span>
            <span className="mx-2 opacity-30">/</span>
            Toolkit
          </p>
        </Reveal>
      </div>

      <div className="mt-12 sm:mt-16 border-y border-line/60 bg-white/40 py-1">
        <Band />
        <div className="h-px bg-line/60" />
        <Band reverse />
      </div>

      <div className="mx-auto mt-16 sm:mt-24 grid w-full max-w-6xl gap-8 sm:gap-12 px-4 sm:px-6 md:grid-cols-2 md:px-10 lg:grid-cols-4">
        {skillGroups.map((group, i) => (
          <Reveal key={group.label} delay={i * 110}>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-amber">
              {group.label}
            </h3>
            <ul className="mt-4 sm:mt-6 space-y-2.5">
              {group.items.map((item) => (
                <li key={item} className="text-sm sm:text-base font-normal text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <div className="mx-auto mt-16 sm:mt-24 w-full max-w-6xl px-4 sm:px-6 md:px-10">
        <Reveal>
          <div className="flex flex-col justify-between gap-3 border-t border-line pt-10 sm:pt-12 sm:flex-row sm:items-baseline">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Education
            </p>
            <p className="font-display text-xl sm:text-2xl text-bone font-medium md:text-3xl">
              {education.school}
              <span className="text-muted font-normal"> — {education.detail}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
