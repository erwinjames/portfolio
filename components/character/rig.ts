import * as THREE from "three";

/**
 * Every animatable value on the character, split into scalars and limb
 * directions so two poses can be interpolated by walking the keys. Rotations
 * are radians; rootX/rootY are fractions of the half-viewport (-1 = left or
 * bottom edge, +1 = right or top).
 */

/** A limb direction in the character's own space: +X is his left, +Y is up,
 *  +Z is the way he faces. Need not be normalized. */
export type Dir = [x: number, y: number, z: number];

export type Pose = {
  rootX: number;
  rootY: number;
  rootZ: number;
  rootRotX: number;
  rootRotY: number;
  rootRotZ: number;
  scale: number;

  torsoRotX: number;
  torsoRotY: number;
  headRotX: number;
  headRotY: number;

  /** 0..1 — how "seated" the beat is. Drives the chair prop's fade, and the
   *  interpolator blends it so he sits down/stands up over the transition. */
  sit: number;
  /** 0..1 — fades in the desk + laptop prop for the "working" beats. */
  desk: number;
  /** 0..1 — fades in the lap MacBook for the seated-casual beat. */
  lap: number;

  /** Where each limb segment points. Upper arm, then forearm; thigh, then shin. */
  armL: Dir;
  foreL: Dir;
  armR: Dir;
  foreR: Dir;
  legL: Dir;
  shinL: Dir;
  legR: Dir;
  shinR: Dir;
};

/** The plain numeric fields — interpolated component-wise. */
export const POSE_KEYS = [
  "rootX", "rootY", "rootZ", "rootRotX", "rootRotY", "rootRotZ", "scale",
  "torsoRotX", "torsoRotY", "headRotX", "headRotY", "sit", "desk", "lap",
] as const satisfies readonly (keyof Pose)[];

/** The direction fields — interpolated as vectors, then re-normalized on use. */
export const POSE_DIRS = [
  "armL", "foreL", "armR", "foreR", "legL", "shinL", "legR", "shinR",
] as const satisfies readonly (keyof Pose)[];

const d = THREE.MathUtils.degToRad;

/** A relaxed stance, reused wherever the legs aren't doing anything special. */
const STAND = {
  legL: [0.07, -1, 0.02] as Dir,
  shinL: [0.03, -1, -0.05] as Dir,
  legR: [-0.07, -1, 0.02] as Dir,
  shinR: [-0.03, -1, -0.05] as Dir,
};

/**
 * One keyframe per section. The character travels across the page as you
 * scroll, always landing in that section's empty lane so it never fights the
 * copy for space.
 *
 * Limbs are declared as directions in his own space — [+X = his left, +Y = up,
 * +Z = the way he faces] — so `[0,-1,0]` is "straight down" no matter what the
 * model's bind pose happens to be.
 */
export const POSES: Pose[] = [
  // 0 — Hero: standing tall, far right so it clears the wordmark.
  {
    rootX: 0.66, rootY: -0.22, rootZ: 0, rootRotX: 0, rootRotY: d(-14), rootRotZ: 0, scale: 1.32,
    torsoRotX: 0, torsoRotY: 0, headRotX: d(-4), headRotY: d(6), sit: 0, desk: 0, lap: 0,
    armL: [0.30, -0.95, 0.06], foreL: [0.20, -0.96, 0.20],
    armR: [-0.30, -0.95, 0.06], foreR: [-0.20, -0.96, 0.20],
    ...STAND,
  },
  // 1 — About: the "casual coding" beat. He takes a chair in the empty
  //     upper-right, MacBook open on his lap, leaning in and typing, head
  //     down at the screen. The chair fades with `sit`, the laptop with
  //     `lap`; the glowing lid logo faces the viewer.
  {
    rootX: 0.70, rootY: 0.42, rootZ: -1.2, rootRotX: 0, rootRotY: d(26), rootRotZ: 0, scale: 0.95,
    torsoRotX: d(6), torsoRotY: d(-4), headRotX: d(16), headRotY: d(-8), sit: 1, desk: 0, lap: 1,
    armL: [0.20, -0.64, 0.55], foreL: [-0.06, 0.20, 0.92],
    armR: [-0.20, -0.64, 0.55], foreR: [0.06, 0.20, 0.92],
    legL: [0.14, -0.18, 0.95], shinL: [0.06, -0.95, 0.12],
    legR: [-0.14, -0.18, 0.95], shinR: [-0.06, -0.95, 0.12],
  },
  // 2 — Work: the "at the desk" beat, placed in the far right lane on desktop
  //     so it never overlaps the left sticky year or the job description text.
  {
    rootX: 0.85, rootY: -0.32, rootZ: -1.0, rootRotX: 0, rootRotY: d(-35), rootRotZ: 0, scale: 0.80,
    torsoRotX: d(10), torsoRotY: 0, headRotX: d(12), headRotY: d(-10), sit: 1, desk: 1, lap: 0,
    armL: [0.20, -0.72, 0.45], foreL: [-0.08, -0.28, 0.92],
    armR: [-0.20, -0.72, 0.45], foreR: [0.08, -0.28, 0.92],
    legL: [0.14, -0.18, 0.95], shinL: [0.06, -0.95, 0.12],
    legR: [-0.14, -0.18, 0.95], shinR: [-0.06, -0.95, 0.12],
  },
  // 3 — Projects: the "look what I built" beat. He stands in the left rail
  //     under the project count, arm extended toward the card grid on the
  //     right, head following the gesture.
  {
    rootX: -0.62, rootY: -0.42, rootZ: -1.0, rootRotX: 0, rootRotY: d(-20), rootRotZ: 0, scale: 0.95,
    torsoRotX: d(-4), torsoRotY: d(8), headRotX: d(-4), headRotY: d(18), sit: 0, desk: 0, lap: 0,
    armL: [0.88, 0.28, 0.24], foreL: [0.94, 0.32, 0.10],
    armR: [-0.28, -0.94, 0.10], foreR: [-0.18, -0.95, 0.22],
    ...STAND,
  },
  // 4 — Toolkit: the "craftsman" beat. Arms folded, chin up, surveying his own
  //     stack — a deliberately narrow silhouette, because the only truly empty
  //     spot in this section is the slot between the skill columns and the
  //     education line.
  {
    rootX: 1.0, rootY: -0.52, rootZ: -2.0, rootRotX: 0, rootRotY: d(-14), rootRotZ: 0, scale: 0.80,
    torsoRotX: d(-6), torsoRotY: 0, headRotX: d(-8), headRotY: d(14), sit: 0, desk: 0, lap: 0,
    armL: [0.38, -0.82, 0.42], foreL: [-0.82, -0.16, 0.55],
    armR: [-0.38, -0.82, 0.42], foreR: [0.82, -0.16, 0.55],
    ...STAND,
  },
  // 5 — Contact: settles into the open right side, his left arm up mid-wave.
  {
    rootX: 0.68, rootY: -0.24, rootZ: -0.4, rootRotX: 0, rootRotY: d(-18), rootRotZ: 0, scale: 1.28,
    torsoRotX: d(-2), torsoRotY: d(6), headRotX: d(-6), headRotY: d(16), sit: 0, desk: 0, lap: 0,
    armL: [0.66, 0.68, 0.30], foreL: [0.44, 0.88, 0.16],
    armR: [-0.28, -0.95, 0.08], foreR: [-0.18, -0.96, 0.20],
    ...STAND,
  },
];

/** Blends two keyframes. `u` is expected to already be eased. Directions are
 *  lerped component-wise; aiming re-normalizes them, so the interim vectors
 *  need not be unit length. */
export function lerpPose(a: Pose, b: Pose, u: number, out: Pose): Pose {
  for (const key of POSE_KEYS) {
    out[key] = a[key] + (b[key] - a[key]) * u;
  }
  for (const key of POSE_DIRS) {
    const va = a[key];
    const vb = b[key];
    const vo = out[key];
    vo[0] = va[0] + (vb[0] - va[0]) * u;
    vo[1] = va[1] + (vb[1] - va[1]) * u;
    vo[2] = va[2] + (vb[2] - va[2]) * u;
  }
  return out;
}

/** Deep enough that the direction arrays aren't shared with the keyframes —
 *  the animation loop mutates them every frame. */
export const clonePose = (p: Pose): Pose => {
  const out = { ...p };
  for (const key of POSE_DIRS) out[key] = [...p[key]] as Dir;
  return out;
};

/** Smoothstep — takes the linear scroll fraction and eases the ends so the
 *  character settles into each pose instead of snapping between them. */
export const smoothstep = (u: number) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};
