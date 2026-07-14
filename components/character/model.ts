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
  "Hairstyle_male_010",
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

  // The pack's palette is bright cartoon primaries — a blue tee and green
  // cargo pants read as a sticker pasted onto the page. Tint every material
  // down so he sits in the scene as a warm, dark figure lit by the amber rim.
  for (const m of materials) {
    const mat = m as THREE.MeshStandardMaterial;
    if (mat.color) mat.color.multiply(new THREE.Color(0.3, 0.31, 0.38));
    if (mat.roughness !== undefined) mat.roughness = 0.72;
    if (mat.metalness !== undefined) mat.metalness = 0.12;
  }

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
