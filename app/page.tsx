import { About } from "@/components/about";
import { Character } from "@/components/character";
import { Contact } from "@/components/contact";
import { Experience } from "@/components/experience";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { ScrollProgress } from "@/components/scroll-progress";
import { Skills } from "@/components/skills";

export default function Home() {
  return (
    <>
      <Character />

      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <ScrollProgress />
      <Nav />

      <main className="relative z-10 flex-1">
        <Hero />
        <About />
        <Experience />
        <Skills />
        <Contact />
      </main>
    </>
  );
}
