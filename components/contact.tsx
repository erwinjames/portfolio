import { Reveal } from "@/components/reveal";
import { profile } from "@/lib/resume";

export function Contact() {
  return (
    <section
      id="contact"
      className="relative mx-auto w-full max-w-6xl px-6 py-32 md:px-10 md:py-48"
    >
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
          Contact
        </p>
      </Reveal>

      <Reveal delay={120}>
        <h2 className="mt-10 font-display text-[clamp(2.5rem,8vw,7rem)] leading-[1.05]">
          Got something that needs
          <span className="text-amber italic"> building?</span>
        </h2>
      </Reveal>

      <Reveal delay={220}>
        <a
          href={`mailto:${profile.email}`}
          className="sweep mt-14 inline-block break-all font-display text-[clamp(1.25rem,3.5vw,2.75rem)] text-bone"
        >
          {profile.email}
        </a>
      </Reveal>

      <Reveal delay={300}>
        <div className="mt-20 flex flex-col justify-between gap-6 border-t border-line pt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted sm:flex-row">
          <a href={`tel:${profile.phone}`} className="sweep text-bone">
            {profile.phone}
          </a>
          <p>{profile.location}</p>
          <a href="#top" className="sweep text-bone">
            Back to top
          </a>
        </div>
      </Reveal>
    </section>
  );
}
