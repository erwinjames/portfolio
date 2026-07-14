"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  aimBone,
  buildChair,
  prepareModel,
  setBone,
  type Skeleton,
} from "./model";
import {
  clonePose,
  lerpPose,
  POSES,
  POSE_DIRS,
  POSE_KEYS,
  smoothstep,
  type Pose,
} from "./rig";

/** Sections the character keys off, in scroll order. One per pose in POSES. */
const SECTION_IDS = ["top", "about", "work", "projects", "skills", "contact"];

const CAMERA_FOV = 34;
const CAMERA_Z = 6;

/** Pose-transition spring. Slightly underdamped, so limbs settle with a touch
 *  of overshoot instead of easing in dead-flat — that's the difference between
 *  "interpolated" and "animated". */
const STIFFNESS = 42;
const DAMPING = 11;

/** Forearms and shins chase their parent limb a beat late. Real bodies have
 *  this lag, and without it the arm swings as one rigid plank. */
const LAG_UPPER = 9;
const LAG_LOWER = 5.5;

export function CharacterScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Filmic response curve. Without this the amber key light clips to a flat
    // orange; ACES rolls the highlights off and is most of why he now reads as
    // "rendered" rather than "lit by three lamps in a void".
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95; // the duotone ramp already sets his level

    host.appendChild(renderer.domElement);

    // Image-based lighting. RoomEnvironment is generated in-memory — no HDR
    // file to ship — and gives the materials something real to reflect.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // ---- Lighting: a low ambient bed, a restrained key, and a hot amber rim.
    // The rim is the loudest light on purpose — it carves his edge out of the
    // ink and ties him to the page's accent colour, which is what sells the
    // whole thing as one image rather than a model floating over a website.
    scene.add(new THREE.AmbientLight(0x222836, 0.5));

    const key = new THREE.DirectionalLight(0xffdcb0, 1.15);
    key.position.set(3, 4.5, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xd99a4e, 4.2);
    rim.position.set(-4.5, 1.8, -3.5);
    scene.add(rim);

    const bounce = new THREE.PointLight(0x6f86ad, 3.5, 16);
    bounce.position.set(-2.5, -1.5, 3);
    scene.add(bounce);

    // A warm practical that rides along with him, so he never falls fully flat
    // against the page as he travels.
    const practical = new THREE.PointLight(0xe0a355, 7, 9, 2);
    scene.add(practical);

    // ---- Viewport-derived placement -----------------------------------------
    let halfHeight = 1;
    let halfWidth = 1;
    let scaleMultiplier = 1;
    let stops: number[] = [];

    const measure = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) {
        stops = POSES.map((_, i) => i / (POSES.length - 1));
        return;
      }

      const raw = SECTION_IDS.map((id, i) => {
        const el = document.getElementById(id);
        if (!el) return i / (SECTION_IDS.length - 1);
        const rect = el.getBoundingClientRect();
        const center = window.scrollY + rect.top + rect.height / 2;
        return (center - window.innerHeight / 2) / maxScroll;
      });

      raw[0] = 0;
      raw[raw.length - 1] = 1;
      for (let i = 1; i < raw.length; i++) {
        raw[i] = Math.min(1, Math.max(raw[i], raw[i - 1] + 0.001));
      }
      stops = raw;
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

      halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * CAMERA_Z;
      halfWidth = halfHeight * camera.aspect;

      // He's authored large for desktop; on narrower screens the copy runs
      // nearly full width, so scale him down harder to stay a background
      // element rather than sitting on the words.
      scaleMultiplier = w < 768 ? 0.46 : w < 1100 ? 0.58 : 1;

      measure();
    };

    const target = clonePose(POSES[0]);
    const current = clonePose(POSES[0]);
    /** Spring velocity, one per scalar field. */
    const velocity: Record<string, number> = {};
    for (const k of POSE_KEYS) velocity[k] = 0;

    // Dwell-and-dash. The character HOLDS his pose while a section is anywhere
    // near view, and makes the trip to the next beat only inside the middle
    // slice of the gap between sections. Interpolating linearly across the
    // whole gap parked him mid-journey — usually on top of the copy — at most
    // scroll offsets.
    const HOLD_IN = 0.34;
    const HOLD_OUT = 0.66;

    const poseFromScroll = (out: Pose) => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const t = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const clamped = Math.min(1, Math.max(0, t));

      let i = 0;
      while (i < stops.length - 2 && clamped > stops[i + 1]) i++;

      const span = stops[i + 1] - stops[i];
      const u = span > 0 ? (clamped - stops[i]) / span : 0;
      const dash = Math.min(1, Math.max(0, (u - HOLD_IN) / (HOLD_OUT - HOLD_IN)));

      return lerpPose(POSES[i], POSES[i + 1], smoothstep(dash), out);
    };

    const charQuat = new THREE.Quaternion();
    const dir = new THREE.Vector3();

    /** Writes a pose onto the skinned rig. */
    const applyPose = (skel: Skeleton, pose: Pose) => {
      skel.root.position.set(
        pose.rootX * halfWidth,
        pose.rootY * halfHeight,
        pose.rootZ,
      );
      skel.root.rotation.set(pose.rootRotX, pose.rootRotY, pose.rootRotZ);
      skel.root.scale.setScalar(pose.scale * scaleMultiplier);

      // Spine and head read best as a nudge from the artist's rest pose.
      setBone(skel, "chest", pose.torsoRotX, pose.torsoRotY, 0);
      setBone(skel, "head", pose.headRotX, pose.headRotY, 0);

      // Limbs are aimed, and aiming reads each bone's parent world rotation —
      // so the spine's new rotation has to be baked into the world matrices
      // before we solve the arms, and each upper limb before its lower one.
      skel.root.updateMatrixWorld(true);
      skel.root.getWorldQuaternion(charQuat);

      const aim = (key: Parameters<typeof aimBone>[1], d: readonly number[]) => {
        dir.set(d[0], d[1], d[2]);
        aimBone(skel, key, dir, charQuat);
      };

      aim("shoulderL", pose.armL);
      aim("shoulderR", pose.armR);
      aim("hipL", pose.legL);
      aim("hipR", pose.legR);

      skel.root.updateMatrixWorld(true);

      aim("elbowL", pose.foreL);
      aim("elbowR", pose.foreR);
      aim("kneeL", pose.shinL);
      aim("kneeR", pose.shinR);
    };

    resize();

    // ---- Load ---------------------------------------------------------------
    let skel: Skeleton | null = null;
    let raf = 0;
    let disposed = false;

    new GLTFLoader().load("/models/character.glb", (gltf) => {
      if (disposed) return;

      skel = prepareModel(gltf.scene as unknown as THREE.Group);
      scene.add(skel.root);

      // The chair rides on the character root, so it travels, turns, and
      // scales with him; the About beat fades it in via the pose's `sit`.
      const chair = buildChair();
      chair.group.position.set(0, 0.02, -0.02);
      skel.root.add(chair.group);

      const setChair = (sit: number) => {
        // Remapped to the tail of the blend: the chair only materialises once
        // he's nearly seated. Fading it linearly with `sit` dragged a ghost
        // chair across the page for the whole transition.
        const t = Math.min(1, Math.max(0, (sit - 0.65) / 0.35));
        const opacity = t * t * (3 - 2 * t);
        chair.group.visible = opacity > 0.02;
        for (const m of chair.materials) m.opacity = opacity;
      };

      poseFromScroll(target);
      Object.assign(current, target);
      for (const k of POSE_DIRS) current[k] = [...target[k]] as typeof current.armL;
      applyPose(skel, current);

      if (reduced) {
        // Reduced motion: one static frame in the resting pose. No travel,
        // no idle, no loop.
        applyPose(skel, POSES[0]);
        setChair(POSES[0].sit);
        practical.position.set(
          POSES[0].rootX * halfWidth + 1,
          POSES[0].rootY * halfHeight + 1,
          2,
        );
        renderer.render(scene, camera);
        return;
      }

      // Timer (r183+) over Clock: it pauses while the tab is hidden, so the
      // page doesn't lurch when you come back to it.
      const timer = new THREE.Timer();

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!skel) return;

        timer.update();
        const dt = Math.min(timer.getDelta(), 0.05);
        const elapsed = timer.getElapsed();

        poseFromScroll(target);

        // Scalars ride a spring — position, scale and turn overshoot a hair and
        // settle, which is what makes the travel feel like weight rather than
        // a lerp.
        for (const k of POSE_KEYS) {
          const force = (target[k] - current[k]) * STIFFNESS;
          velocity[k] += (force - velocity[k] * DAMPING) * dt;
          current[k] += velocity[k] * dt;
        }

        // Limb directions damp instead — a springy overshoot on a joint angle
        // looks broken, not alive. The lower limbs use a slower constant so
        // they trail their parent: secondary motion.
        for (const k of POSE_DIRS) {
          const lower = k === "foreL" || k === "foreR" || k === "shinL" || k === "shinR";
          const rate = 1 - Math.exp(-(lower ? LAG_LOWER : LAG_UPPER) * dt);
          const c = current[k];
          const t = target[k];
          c[0] += (t[0] - c[0]) * rate;
          c[1] += (t[1] - c[1]) * rate;
          c[2] += (t[2] - c[2]) * rate;
        }

        applyPose(skel, current);
        setChair(Math.min(1, Math.max(0, current.sit)));

        // ---- Idle life, layered on top of the settled pose ------------------
        // Breath: the chest rises on a slow cycle.
        const breath = Math.sin(elapsed * 1.15);
        skel.bones.chest?.scale.setScalar(1 + breath * 0.012);

        // Weight shift: he sways gently from hip to hip, and floats.
        skel.root.position.y += Math.sin(elapsed * 0.75) * 0.045;
        skel.root.position.x += Math.sin(elapsed * 0.4) * 0.012;
        skel.root.rotation.z += Math.sin(elapsed * 0.5) * 0.012;
        skel.root.rotation.y += Math.sin(elapsed * 0.45) * 0.05;

        // The head leads the sway slightly, as a head does.
        const head = skel.bones.head;
        if (head) {
          head.rotation.y += Math.sin(elapsed * 0.6 + 0.5) * 0.07;
          head.rotation.x += Math.sin(elapsed * 0.9) * 0.03;
        }

        // Keep the warm practical riding just off his shoulder.
        practical.position.set(
          skel.root.position.x + 1.1,
          skel.root.position.y + 1.2,
          2.2,
        );
        practical.intensity = 6 + Math.sin(elapsed * 1.6) * 1.8;

        renderer.render(scene, camera);
      };

      raf = requestAnimationFrame(tick);
    });

    const onResize = () => {
      resize();
      if (skel && reduced) {
        applyPose(skel, POSES[0]);
        renderer.render(scene, camera);
      }
    };

    window.addEventListener("resize", onResize);
    const remeasure = window.setTimeout(measure, 1200);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(remeasure);
      window.removeEventListener("resize", onResize);
      skel?.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5]"
    />
  );
}
