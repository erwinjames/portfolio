import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { profile, stats } from "@/lib/resume";

export function About() {
  return (
    <section
      id="about"
      className="relative mx-auto w-full max-w-6xl px-6 py-40 md:px-10 md:py-48"
    >
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
          <span className="text-amber">01</span>
          <span className="mx-2 opacity-30">/</span>
          About
        </p>
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-10 max-w-4xl font-display text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.25]">
          {profile.summary}
        </p>
      </Reveal>

      <dl className="mt-24 grid gap-12 border-t border-line pt-12 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 140}>
            <dt className="font-display text-6xl tabular-nums text-amber md:text-7xl">
              <CountUp value={stat.value} />
            </dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted">
              {stat.label}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
