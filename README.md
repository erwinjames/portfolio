# Erwin Manugas — Portfolio

A cinematic scroll portfolio: dark editorial design with film grain, an amber
accent, and a 3D character who lives in the page — travelling from section to
section, sitting down, typing on a MacBook, pointing at project cards, and
waving goodbye.

**Sections:** Hero → About → Experience → Projects → Toolkit → Contact.

- Live dev: `npm run dev` → http://localhost:3009
- Production: `npm run build` (fully static output)

---

## Stack

| Layer     | Choice                             | Why                                                                                     |
| --------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| Framework | **Next.js 16** (App Router)        | Server Components by default; only the 5 components that need scroll state are client   |
| Styling   | **Tailwind CSS v4**                | Theme tokens declared in CSS (`@theme inline`), no config file                          |
| 3D        | **Three.js** (vanilla, no wrapper) | Direct control of the render loop; no React-Three-Fiber reconciler overhead             |
| Language  | **TypeScript**                     | The pose system is typed data — typos in a keyframe fail the build instead of the scene |

No animation library. Every animation on the page is hand-rolled with CSS,
`IntersectionObserver`, `requestAnimationFrame`, and Three.js.

---

## Design system

### Color palette

Defined once as CSS custom properties in [`app/globals.css`](app/globals.css)
and mapped to Tailwind tokens via `@theme inline`:

| Token     | Value                    | Role                                            |
| --------- | ------------------------ | ----------------------------------------------- |
| `--ink`   | `#08090b`                | Page background — near-black with a blue cast   |
| `--ink-2` | `#0d0f13`                | Raised surfaces (editor background)             |
| `--bone`  | `#ece8e1`                | Body text — warm off-white, never pure white    |
| `--muted` | `#8b877f`                | Secondary text — warm grey                      |
| `--amber` | `#d99a4e`                | The single accent: highlights, rims, links      |
| `--line`  | `rgba(236,232,225,0.1)`  | Hairline borders                                |

The system is deliberately **one accent color**. Amber appears in the type,
the scroll progress bar, the character's rim light, his duotone skin tones,
the MacBook logo, and the editor syntax colors — one color family across DOM
and WebGL is what makes the 3D feel like part of the page instead of an
embedded widget.

### Typography

| Font                 | Use                                    | Loaded via                          |
| -------------------- | -------------------------------------- | ----------------------------------- |
| **Instrument Serif** | Display headlines (`--font-display`)   | `next/font/google`, self-hosted     |
| **Geist Sans**       | Body copy                              | `next/font/google`                  |
| **Geist Mono**       | Labels, nav, tags (letter-spaced caps) | `next/font/google`                  |

The contrast between a big italic serif and small tracked-out mono labels is
the core editorial look.

### Texture

- **Film grain**: a fixed, full-screen SVG `feTurbulence` noise (inline data
  URI, no asset) at 13% opacity, jittered by a 2-frame steps() animation.
- **Vignette**: a fixed radial gradient darkening the frame edges.

Both are pure CSS overlays — they cost nothing and give the "shot on film"
finish.

---

## Page animations (DOM layer)

All in [`app/globals.css`](app/globals.css) + small client components:

| Effect                | How it works                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intro curtain**     | A fixed overlay holds ~1.1s while an amber rule draws across, then slides up. Body scroll is locked during it. ([`intro.tsx`](components/intro.tsx)) |
| **Letter-rise hero**  | The name is split into per-letter `<span>`s; each animates `translateY(1.05em) → 0` with a 35ms stagger, delayed until the curtain lifts       |
| **Hero camera push**  | A scroll-driven CSS variable (`--p`) scales/blurs/fades the hero as you leave it — set via rAF, animated by `calc()` in CSS                    |
| **Scroll reveals**    | `IntersectionObserver` flips a `data-visible` attribute once; CSS transitions opacity + `translateY` + `blur`. ([`reveal.tsx`](components/reveal.tsx)) |
| **Count-up stats**    | rAF loop with ease-out cubic, started by an observer at 50% visibility; respects reduced motion. ([`count-up.tsx`](components/count-up.tsx))   |
| **Skill marquees**    | Content duplicated once, `translateX(-50%)` loop — seamless because the track is exactly two copies. Pauses on hover                           |
| **Link sweeps**       | `background-size: 0→100%` of a 1px gradient — underline that draws itself                                                                     |
| **Scroll progress**   | Fixed 1px bar, `scaleX` set from `scrollY / scrollable` in a rAF-throttled listener                                                           |
| **Nav**               | Fades in after the hero; active section tracked with an observer using `rootMargin: -45% 0px -45%` (whatever crosses mid-viewport wins)       |

**Motion accessibility:** every animation above collapses under
`prefers-reduced-motion: reduce` — content renders fully visible with no
transitions, the curtain never shows, and the 3D character renders one static
frame with no loop at all.

---

## The 3D character

The centerpiece. Source: the free **"Creative Characters" pack by ithappy on
Fab** (`public/models/character.glb`, 1.7 MB, textures embedded).

### Why this model works

The pack is **modular**: 30 costume/prop meshes all skinned to **one shared
Mixamo-style skeleton** (Hips → Spine → Spine1 → Neck/Head, Arm → ForeArm →
Hand, etc.) with **zero baked animation clips**. That means:

- The character is assembled by toggling mesh visibility — body, face, bangs
  hairstyle, glasses, t-shirt, pants, sneakers on; hats/clown nose/etc. off
  ([`model.ts` → `VISIBLE_PARTS`](components/character/model.ts)).
- With no animation clips, the bones are free to be driven **procedurally**
  every frame — the whole animation system below is possible because of this.

### Recoloring: duotone texture remap

The stock textures are bright cartoon primaries (blue tee, green cargos) — a
**hue clash** with the ink/amber page that no amount of darkening fixes. At
load, the texture atlas is redrawn on a canvas: every texel's **Rec. 709
luminance** is remapped through a 5-stop ramp of the site's own colors
(ink → dark amber → amber → warm bone). All the artist's shading survives;
the palette becomes the page's.

**Pitfall worth knowing:** the ramp is parsed from hex by hand because
`THREE.Color` converts hex into *linear* color space — writing those values
into an sRGB canvas crushed the shadows to black.

### Rendering

- **ACES filmic tone mapping** (`renderer.toneMapping`) — rolls highlights
  off like film instead of clipping to flat orange.
- **Image-based lighting** via `RoomEnvironment` + `PMREMGenerator` —
  generated in memory, no HDR file shipped; kept subtle (`envMapIntensity`).
- **Light rig:** low cool ambient, restrained warm key, a **hot amber rim**
  (the loudest light, on purpose — it carves his silhouette out of the dark
  and ties him to the accent color), a cool bounce, and a warm practical
  point light that follows him.
- Canvas is `position: fixed`, transparent, behind the DOM text
  (`z-index` 5 vs content 10) — **text always renders on top of him**.

### The pose system (one keyframe per section)

Poses live as typed data in [`rig.ts` → `POSES`](components/character/rig.ts).
Each beat declares:

- Root placement: `rootX/rootY` as **viewport fractions**, `rootZ` depth,
  yaw, scale.
- Spine/head: small Euler nudges from the artist's rest pose.
- **Limbs as direction vectors**, not angles: `armL: [0.3, -0.95, 0.06]`
  means "upper arm points down-and-slightly-out" in the character's own
  space. `[0, -1, 0]` is always "straight down" no matter the bind pose.
- Prop scalars: `sit`, `desk`, `lap` (0..1) fade the chair / desk / table
  props in and out.

**Why directions instead of angles:** the rig's bind rotations are arbitrary
per bone, so Euler offsets were unpredictable (first attempts produced arms
bending backwards). Instead, an **aim solver**
([`model.ts` → `aimBone`](components/character/model.ts)) rotates each bone so
its length axis lands on the requested direction — critically, rotating **from
the bone's bind orientation** (shortest-arc from its bind direction), which
preserves the bind *roll*. A naive shortest-arc from the raw axis leaves the
twist around the limb undefined and elbows hinge sideways.

The six beats: **Hero** standing tall · **About** seated at a table typing on
a MacBook · **Experience** over-the-shoulder at a desk, coding · **Projects**
pointing at the cards · **Toolkit** arms folded · **Contact** waving.

### Motion architecture (the part most likely to be asked about)

Three separate concerns, deliberately decoupled:

1. **Which beat?** — decided by scroll with **hysteresis** (commit to the
   next section at 58% of the gap, release at 42%) so the boundary never
   flaps.
2. **How does he get there?** — **time-based travel**: every flight is a
   fixed ~1.05s eased glide, identical whether you scroll slowly, flick the
   wheel, or click a nav link. (The first version scrubbed travel by scroll
   position — a fast flick teleported him. Decoupling progress from scroll
   fixed it.) Retargeting mid-flight snapshots the currently rendered pose
   and glides on from there, so chained scrolls stay continuous.
3. **How does it feel?** — two smoothing layers on top:
   - Scalars (position/scale/yaw) ride a slightly **under-damped spring**
     (stiffness 42, damping 11) — a touch of overshoot on arrival.
   - Limb directions use **exponential damping with different rates for
     upper and lower segments** (forearms/shins lag their parent) —
     secondary motion, so an arm never swings as one rigid plank.

**Document anchoring:** while parked at a beat, his Y position adds
`(scrollY − sectionAnchor) × worldUnitsPerPixel` — he **rides with the page
content 1:1** instead of hanging fixed in the viewport, entering and leaving
with his section like a page element. World-units-per-pixel is derived from
the camera FOV and his depth.

**Presence ghost:** during a flight he fades to ~22% opacity (on the canvas
element — free, and immune to WebGL transparency-sorting artifacts) so the
trip never covers page details; he lands solid in the next section's empty
lane.

**Idle layer** (added after the pose, every frame): breathing chest scale,
slow weight-shift sway, head drift — and while a laptop beat is active,
**typing**: alternating forearm taps out of phase per hand under a slow
ebb-and-flow envelope, plus small reading nods. Applied as local elbow
nudges *after* aiming, so the animation can't drift the hands off the
keyboard.

### Props (all primitives, no extra assets)

Chair, About-table, and Work-desk are built from `BoxGeometry` in the page's
wood tones. The **MacBook** ([`model.ts` → `buildMacBook`](components/character/model.ts))
is aluminum boxes + a lid group, with:

- a **live code editor** on a 256×176 `CanvasTexture`: macOS traffic-light
  chrome, line-number gutter, syntax-colored token bars that type themselves
  out with a blinking cursor, looping (~8 redraws/s, `toneMapped: false` so
  the UI stays crisp);
- a glowing amber logo on the lid back;
- a cool **screen light** that spills onto his face — faded together with
  the prop (it's a light, not a material, so it needs explicit handling).

Props are parented to the character root (they travel/turn/scale with him)
and fade via the pose scalars — remapped to the **tail of the transition**
(last 35%) because a linear fade dragged ghost furniture across the page.

### Responsive strategy

- Scale tiers: full under ≥1100px, 0.58 below that, 0.46 under 768px.
- **Phones have no side lanes** (single-column layout), so the About / Work /
  Projects beats re-anchor to the **empty padding gap below their section** —
  he appears as a vignette between sections and can never cover words. Beat
  positions are overridden at runtime (`rebuildPoses`), and anchors are
  measured from the live DOM (`measure`), re-run on resize.

### Performance notes

- One `requestAnimationFrame` loop total; `THREE.Timer` (pauses when the tab
  is hidden); frame delta clamped to 50ms so slow devices slow the motion
  instead of exploding it.
- `setPixelRatio` capped at 1.75.
- Skinned meshes set `frustumCulled = false` (their culling bounds go stale
  once posed).
- The editor texture redraws at most 8×/s; the duotone remap runs once at
  load.
- All geometries/materials/textures are tracked and disposed on unmount.

---

## Project structure

```
app/
  layout.tsx         fonts, metadata, shell
  page.tsx           section composition + overlays
  globals.css        tokens, grain, all CSS animation
components/
  hero / about / experience / projects / skills / contact
  nav, reveal, count-up, intro, scroll-progress
  character/
    index.tsx        client-only dynamic import (ssr: false)
    character-scene.tsx  renderer, lights, travel/spring/idle loops
    rig.ts           ★ the six pose keyframes (edit these to re-stage him)
    model.ts         GLB prep, duotone, aim solver, prop builders
lib/
  resume.ts          ★ ALL site copy: jobs, projects, skills, contact
public/models/character.glb
```

★ = the two files that answer "how do I change something."

---

## Asset note

`public/models/character.glb` is from the free "Creative Characters" pack by
**ithappy** on [Fab](https://www.fab.com), included so the repo is
self-contained. If you fork this, check the Fab standard license before
reusing the model elsewhere.
