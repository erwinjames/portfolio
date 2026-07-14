# Erwin Manugas — Portfolio

A cinematic scroll portfolio: dark ink, amber accent, film grain, and a 3D
character who travels through the page — striking a different pose for every
section as you scroll.

**Live sections:** Hero → About → Experience → Projects → Toolkit → Contact.

## The 3D character

- Loaded from a rigged GLB (modular character pack from Fab) and driven
  bone-by-bone — no baked animation clips.
- One pose keyframe per section, declared as limb *directions* in
  [`components/character/rig.ts`](components/character/rig.ts); scrolling
  blends between them with spring physics and secondary limb lag.
- Recolored into the site palette at load by remapping his texture atlas
  through an ink → amber → bone duotone ramp
  ([`components/character/model.ts`](components/character/model.ts)).
- Rendered with ACES filmic tone mapping and image-based lighting.
- Fully static under `prefers-reduced-motion`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, static output)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Three.js](https://threejs.org) — vanilla, no wrapper
- TypeScript

## Development

```bash
npm install
npm run dev    # serves on http://localhost:3009
```

`npm run build` produces the static production build.

## Editing content

All copy lives in [`lib/resume.ts`](lib/resume.ts) — experience, projects,
skills, and contact details. The components render whatever is there.

To move or re-pose the character, edit the labeled keyframes in
[`components/character/rig.ts`](components/character/rig.ts): `rootX`/`rootY`
are screen-fractions, limbs are direction vectors in the character's own space.

## Asset note

`public/models/character.glb` comes from the free "Creative Characters"
pack by ithappy on [Fab](https://www.fab.com) and is included here to keep the
site self-contained. If you fork this repo, check the Fab standard license
before reusing the model elsewhere.
