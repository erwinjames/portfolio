import { About } from "@/components/about";
import { Character } from "@/components/character";
import { Contact } from "@/components/contact";
import { Experience } from "@/components/experience";
import { Hero } from "@/components/hero";
import { Intro } from "@/components/intro";
import { Nav } from "@/components/nav";
import { Projects } from "@/components/projects";
import { ScrollProgress } from "@/components/scroll-progress";
import { Skills } from "@/components/skills";

export default function Home() {
  return (
    <>
      <Intro />
      <Character />

      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <ScrollProgress />
      <Nav />

      <main className="relative z-10 flex-1">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-2 px-6 py-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:flex-row md:px-10">
          <p>© 2026 Erwin James Manugas</p>
          <p>
            Next.js <span className="text-amber">×</span> Three.js — designed in
            ink <span className="text-amber">&</span> amber
          </p>
        </div>
      </footer>
    </>
  );
}
