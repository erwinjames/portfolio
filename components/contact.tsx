import { Reveal } from "@/components/reveal";
import { profile } from "@/lib/resume";

export function Contact() {
  return (
    <section
      id="contact"
      className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 md:px-10 md:py-44"
    >
      <Reveal>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-muted">
          <span className="text-amber">05</span>
          <span className="mx-2 opacity-30">/</span>
          Contact
        </p>
      </Reveal>

      <Reveal delay={120}>
        <h2 className="mt-8 sm:mt-10 font-display text-[clamp(2.2rem,7.5vw,7rem)] leading-[1.05] text-bone font-medium">
          Got something that needs
          <span className="text-amber italic font-normal"> building?</span>
        </h2>
      </Reveal>

      <Reveal delay={220}>
        <a
          href={`mailto:${profile.email}`}
          className="mt-10 sm:mt-14 inline-block break-all font-display text-[clamp(1.2rem,3.2vw,2.75rem)] font-semibold text-amber transition-colors hover:text-amber/80 hover:underline"
        >
          {profile.email}
        </a>
      </Reveal>

      <Reveal delay={300}>
        <div className="mt-16 sm:mt-20 flex flex-col justify-between gap-4 sm:gap-6 border-t border-line pt-8 sm:pt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted sm:flex-row">
          <a href={`tel:${profile.phone}`} className="font-semibold text-bone hover:text-amber transition-colors">
            {profile.phone}
          </a>
          <p>{profile.location}</p>
          <a href="#top" className="font-semibold text-bone hover:text-amber transition-colors">
            Back to top ↑
          </a>
        </div>
      </Reveal>
    </section>
  );
}
