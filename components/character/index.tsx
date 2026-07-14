"use client";

import dynamic from "next/dynamic";

/**
 * Three.js is a heavy dependency and the scene is useless without a DOM, so it
 * is pulled in on the client only, after the page has painted.
 */
export const Character = dynamic(
  () => import("./character-scene").then((m) => m.CharacterScene),
  { ssr: false },
);
