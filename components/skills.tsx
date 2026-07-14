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
                className="flex items-center gap-8 px-8 font-display text-4xl text-muted md:text-6xl"
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
    <section id="skills" className="relative py-32 md:py-48">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
            Toolkit
          </p>
        </Reveal>
      </div>

      <div className="mt-16 border-y border-line">
        <Band />
        <div className="h-px bg-line" />
        <Band reverse />
      </div>

      <div className="mx-auto mt-24 grid w-full max-w-6xl gap-12 px-6 md:grid-cols-2 md:px-10 lg:grid-cols-4">
        {skillGroups.map((group, i) => (
          <Reveal key={group.label} delay={i * 110}>
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-amber">
              {group.label}
            </h3>
            <ul className="mt-6 space-y-2">
              {group.items.map((item) => (
                <li key={item} className="text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <div className="mx-auto mt-24 w-full max-w-6xl px-6 md:px-10">
        <Reveal>
          <div className="flex flex-col justify-between gap-2 border-t border-line pt-12 sm:flex-row sm:items-baseline">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              Education
            </p>
            <p className="font-display text-2xl md:text-3xl">
              {education.school}
              <span className="text-muted"> — {education.detail}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
