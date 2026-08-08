import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { profile, stats } from "@/lib/resume";

export function About() {
  return (
    <section
      id="about"
      className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 md:px-10 md:py-44"
    >
      <Reveal>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-muted">
          <span className="text-amber">01</span>
          <span className="mx-2 opacity-30">/</span>
          About
        </p>
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-8 sm:mt-10 max-w-4xl font-display text-[clamp(1.5rem,3.8vw,3.25rem)] leading-[1.3] text-bone">
          {profile.summary}
        </p>
      </Reveal>

      <dl className="mt-16 sm:mt-24 grid gap-8 sm:gap-12 border-t border-line pt-10 sm:pt-12 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 140}>
            <dt className="font-display text-5xl sm:text-6xl tabular-nums text-amber font-medium md:text-7xl">
              <CountUp value={stat.value} />
            </dt>
            <dd className="mt-2 sm:mt-3 text-sm font-medium leading-relaxed text-muted">
              {stat.label}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
