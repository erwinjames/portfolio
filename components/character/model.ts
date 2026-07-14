import * as THREE from "three";

/**
 * The GLB is a modular pack: 30 costume/prop meshes all skinned to one shared
 * skeleton. We show only the pieces that build our man and hide the rest —
 * hats, gloves, clown nose, pacifier, headphones, alternate costumes.
 *
 * Names come straight from the glTF node names.
 */
export const VISIBLE_PARTS = new Set([
  "Body_010",
  "Male_emotion_usual_001",
  "Hairstyle_male_012",
  "Glasses_004",
  "T_Shirt_009",
  "Pants_010",
  "Shoe_Sneakers_009",
  // Moustache_001 deliberately off — facial hair was the single strongest
  // "older" cue. Clean-shaven reads as twenty-something.
]);

/** Maps our abstract joints onto the pack's Mixamo-style bone names. */
export const BONE_NAMES = {
  root: "Root",
  hips: "Hips",
  spine: "Spine",
  chest: "Spine1",
  neck: "Neck",
  head: "Head",
  shoulderL: "LeftArm",
  elbowL: "LeftForeArm",
  shoulderR: "RightArm",
  elbowR: "RightForeArm",
  hipL: "LeftUpLeg",
  kneeL: "LeftLeg",
  hipR: "RightUpLeg",
  kneeR: "RightLeg",
} as const;

export type BoneKey = keyof typeof BONE_NAMES;

/**
 * The pack ships in a T-pose — arms straight out along X. Every pose keyframe
 * is authored as if the figure rests with its arms down, so we fold this
 * constant drop into the shoulders. Mirrored: negative on the left, positive
 * on the right.
 */
export const T_POSE_ARM_DROP = THREE.MathUtils.degToRad(104);

export type Skeleton = {
  /** The wrapper we move/scale/rotate as a whole. */
  root: THREE.Group;
  bones: Partial<Record<BoneKey, THREE.Bone>>;
  /** Each bone's bind rotation, local to its parent. Spine/head poses are
   *  applied as deltas from these. */
  rest: Partial<Record<BoneKey, THREE.Quaternion>>;
  /** Each bone's bind rotation in the character's space, and the direction it
   *  points there. Aiming rotates FROM these rather than from the raw +Y axis,
   *  which preserves the bone's bind roll — without that, the twist around the
   *  limb is undefined and elbows/knees hinge backwards as the pose moves. */
  restWorld: Partial<Record<BoneKey, THREE.Quaternion>>;
  restDir: Partial<Record<BoneKey, THREE.Vector3>>;
  dispose: () => void;
};

/** The duotone ramp he gets remapped onto: ink in shadow, amber through the
 *  mids, warm bone in the highlights. These are the page's own colours. */
const RAMP: [number, string][] = [
  [0.0, "#0b0d11"],
  [0.45, "#4a3520"],
  [0.72, "#a9743a"],
  [0.9, "#d7b184"],
  [1.0, "#f0e3cd"],
];

/**
 * Rebuilds the pack's colour atlas as a duotone.
 *
 * The stock textures are saturated cartoon primaries — a cornflower tee, grass
 * green cargos. Against an ink page with an amber accent that is a HUE clash,
 * not a brightness one, so dimming them only ever produced a darker blue. This
 * takes each texel's luminance and remaps it through the site's own ramp, which
 * keeps every bit of the artist's shading and shadow detail while putting the
 * whole figure in the page's colour story.
 *
 * Returns null if the texture image can't be read, in which case the caller
 * keeps the original map rather than rendering him untextured.
 */
function duotoneTexture(source: THREE.Texture): THREE.CanvasTexture | null {
  const image = source.image as CanvasImageSource & {
    width?: number;
    height?: number;
  };
  const w = image?.width ?? 0;
  const h = image?.height ?? 0;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, w, h);

  // Build a 256-entry lookup of the ramp so the per-pixel loop is just indexing.
  //
  // The hex is parsed by hand rather than through THREE.Color on purpose:
  // THREE.Color converts hex into the LINEAR working colour space, and we are
  // writing bytes into an sRGB canvas. Routing the ramp through it crushed the
  // shadow stop from ~13 to ~1 and rendered him effectively black.
  const lut = new Uint8Array(256 * 3);
  const stops = RAMP.map(([at, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return { at, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  });

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].at && t <= stops[s + 1].at) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b.at - a.at;
    const u = span > 0 ? (t - a.at) / span : 0;
    lut[i * 3] = a.r + (b.r - a.r) * u;
    lut[i * 3 + 1] = a.g + (b.g - a.g) * u;
    lut[i * 3 + 2] = a.b + (b.b - a.b) * u;
  }

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    // Rec. 709 luma — perceptual, so the green cargos don't come out lighter
    // than the blue tee just because green reads brighter to a naive average.
    const luma =
      (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) | 0;
    const o = luma * 3;
    px[i] = lut[o];
    px[i + 1] = lut[o + 1];
    px[i + 2] = lut[o + 2];
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // glTF UVs assume an unflipped texture; CanvasTexture flips by default
  tex.wrapS = source.wrapS;
  tex.wrapT = source.wrapT;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Prepares a loaded glTF scene: hides the parts we don't want, finds the bones,
 * records the bind pose, and normalizes the model to a known height so the
 * pose keyframes (authored in world units) land predictably.
 */
export function prepareModel(gltf: THREE.Group, targetHeight = 1.95): Skeleton {
  const bones: Partial<Record<BoneKey, THREE.Bone>> = {};
  const rest: Partial<Record<BoneKey, THREE.Quaternion>> = {};
  const restWorld: Partial<Record<BoneKey, THREE.Quaternion>> = {};
  const restDir: Partial<Record<BoneKey, THREE.Vector3>> = {};
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();

  gltf.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.visible = VISIBLE_PARTS.has(mesh.name);
      mesh.frustumCulled = false; // skinned bounds go stale once we pose it
      geometries.add(mesh.geometry);
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(m);
      }
    }
  });

  // Recolour him into the page's palette, then let the amber rim do the
  // modelling. The duotone is what makes him look art-directed rather than
  // like stock geometry dropped onto a dark background.
  const rebuilt = new Map<THREE.Texture, THREE.CanvasTexture>();

  for (const m of materials) {
    const mat = m as THREE.MeshStandardMaterial;

    if (mat.map) {
      let ramped = rebuilt.get(mat.map);
      if (!ramped) {
        const made = duotoneTexture(mat.map);
        if (made) {
          rebuilt.set(mat.map, made);
          ramped = made;
        }
      }
      if (ramped) {
        mat.map.dispose();
        mat.map = ramped;
      }
    }

    // The ramp already carries the colour, so the base tint stays neutral and
    // only sets overall level.
    if (mat.color) mat.color.setScalar(0.92);
    if (mat.roughness !== undefined) mat.roughness = 0.64;
    if (mat.metalness !== undefined) mat.metalness = 0.05;

    // Image-based lighting gives the surfaces something real to reflect, but
    // kept low: at full strength it floods the figure and he reads as a bright
    // toy stuck on the page instead of a form emerging from the dark.
    mat.envMapIntensity = 0.14;

    mat.needsUpdate = true;
  }

  const madeTextures = [...rebuilt.values()];

  for (const [key, name] of Object.entries(BONE_NAMES) as [BoneKey, string][]) {
    const bone = gltf.getObjectByName(name) as THREE.Bone | undefined;
    if (bone) {
      bones[key] = bone;
      rest[key] = bone.quaternion.clone();
    }
  }

  // Softer build than before — he reads as a twenty-something now, so this is
  // a slight paunch rather than a heavy gut. The lower spine and hips thicken
  // and the chest counter-scales by the inverse, so the bulk lands on the belly
  // while the head, arms and shoulders keep their proportions.
  const spine = bones.spine;
  const chest = bones.chest;
  if (spine && chest) {
    spine.scale.set(1.12, 1.0, 1.2);
    chest.scale.set(1 / 1.12, 1.0, 1 / 1.2);
  }
  bones.hips?.scale.set(1.08, 1.0, 1.12);

  // Record the bind pose in character space. This has to happen AFTER the bone
  // scaling above and BEFORE anything poses him.
  gltf.updateMatrixWorld(true);
  for (const [key, bone] of Object.entries(bones) as [BoneKey, THREE.Bone][]) {
    const q = bone.getWorldQuaternion(new THREE.Quaternion());
    restWorld[key] = q;
    restDir[key] = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
  }

  // Normalize height. The pack's units aren't guaranteed, and every pose
  // keyframe assumes a figure roughly 1.95 units tall.
  const box = new THREE.Box3().setFromObject(gltf);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = size.y > 0 ? targetHeight / size.y : 1;

  const inner = new THREE.Group();
  inner.add(gltf);
  inner.scale.setScalar(scale);
  // Drop the model so its midpoint sits on the group origin — the pose system
  // positions by centre, not by feet.
  inner.position.y = -(box.min.y + size.y / 2) * scale;

  const root = new THREE.Group();
  root.add(inner);

  return {
    root,
    bones,
    rest,
    restWorld,
    restDir,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of madeTextures) t.dispose();
    },
  };
}

/**
 * A simple four-legged chair in the page's palette, sized for the normalized
 * (1.95-unit) character and meant to be parented to the character root so it
 * travels, turns, and scales with him. Materials are transparent so the About
 * beat can fade it in and out via the pose's `sit` scalar.
 */
export function buildChair(): {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];

  const wood = new THREE.MeshStandardMaterial({
    color: 0x2e2118,
    roughness: 0.7,
    metalness: 0.08,
    flatShading: true,
    transparent: true,
    opacity: 0,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x8a5f2e,
    roughness: 0.5,
    metalness: 0.15,
    transparent: true,
    opacity: 0,
  });

  const box = (
    w: number, h: number, dp: number,
    x: number, y: number, z: number,
    mat: THREE.Material,
  ) => {
    const g = new THREE.BoxGeometry(w, h, dp);
    geos.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  // Seat, with a thin amber-toned edge strip so it reads against the ink.
  box(0.68, 0.07, 0.6, 0, -0.16, 0.12, wood);
  box(0.68, 0.015, 0.6, 0, -0.115, 0.12, trim);

  // Backrest, tilted back a touch.
  const back = box(0.68, 0.78, 0.06, 0, 0.22, -0.21, wood);
  back.rotation.x = THREE.MathUtils.degToRad(-7);

  // Legs.
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      box(0.055, 0.62, 0.055, 0.29 * sx, -0.5, 0.12 + 0.24 * sz, wood);
    }
  }

  return {
    group,
    materials: [wood, trim],
    dispose: () => {
      for (const g of geos) g.dispose();
      wood.dispose();
      trim.dispose();
    },
  };
}

const _euler = new THREE.Euler();
const _delta = new THREE.Quaternion();

/** Rotates a bone by `x`/`y`/`z` radians away from its bind rotation. Used for
 *  the spine and head, where a nudge from the artist's rest pose is what we
 *  actually want. */
export function setBone(
  skel: Skeleton,
  key: BoneKey,
  x: number,
  y: number,
  z: number,
) {
  const bone = skel.bones[key];
  const bind = skel.rest[key];
  if (!bone || !bind) return;
  _euler.set(x, y, z);
  _delta.setFromEuler(_euler);
  bone.quaternion.copy(bind).multiply(_delta);
}

const _parentQ = new THREE.Quaternion();
const _inv = new THREE.Quaternion();
const _arc = new THREE.Quaternion();
const _desired = new THREE.Quaternion();
const _dir = new THREE.Vector3();

/**
 * Points a limb bone along `dir`, given in the CHARACTER's own space
 * (+X = his left, +Y = up, +Z = the way he faces). So `[0,-1,0]` is "straight
 * down" whatever the model's bind pose happens to be.
 *
 * Every bone runs down its local +Y (each child sits at a pure +Y offset), but
 * the bind rotations are arbitrary, which is why Euler offsets are guesswork.
 * We solve for the rotation directly.
 *
 * Crucially we rotate the bone FROM ITS BIND ORIENTATION, not from the bare +Y
 * axis. A shortest-arc from the axis satisfies the direction but leaves the
 * twist around the limb undefined — which sends the elbow and knee hinges
 * spinning to arbitrary angles, so the arms appear to bend backwards as the
 * pose animates. Swinging the bind orientation onto the target keeps the bind
 * roll intact and the joints hinge the way a body does:
 *
 *   desired = shortestArc(bindDir, dir) · bindRotation      (character space)
 *   bone.quaternion = (parentWorldRotation in character space)⁻¹ · desired
 *
 * `charQuat` is the character root's world rotation, and the bone's ancestors
 * must already have their world matrices updated this frame.
 */
export function aimBone(
  skel: Skeleton,
  key: BoneKey,
  dir: THREE.Vector3,
  charQuat: THREE.Quaternion,
) {
  const bone = skel.bones[key];
  const bindQ = skel.restWorld[key];
  const bindDir = skel.restDir[key];
  if (!bone || !bone.parent || !bindQ || !bindDir) return;

  // Where we want the limb to point, in character space.
  _dir.copy(dir).normalize();

  // Swing the bind orientation onto that direction, preserving its roll.
  _arc.setFromUnitVectors(bindDir, _dir);
  _desired.copy(_arc).multiply(bindQ);

  // Strip the character's own rotation off the parent, so we're composing
  // purely in character space, then express the result local to the parent.
  bone.parent.getWorldQuaternion(_parentQ);
  _inv.copy(charQuat).invert().multiply(_parentQ).invert();

  bone.quaternion.copy(_inv).multiply(_desired);
}
