"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { aimBone, prepareModel, setBone, type Skeleton } from "./model";
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
const SECTION_IDS = ["top", "about", "work", "skills", "contact"];

const CAMERA_FOV = 34;
const CAMERA_Z = 6;

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
    host.appendChild(renderer.domElement);

    // ---- Lighting: cool fill, warm amber key + rim, to match the page.
    scene.add(new THREE.AmbientLight(0x4a5262, 1.4));

    const key = new THREE.DirectionalLight(0xffe6c4, 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xd99a4e, 2.6);
    rim.position.set(-4, 1.5, -3);
    scene.add(rim);

    const fill = new THREE.PointLight(0x9fb4d8, 10, 14);
    fill.position.set(-2.5, -1, 3);
    scene.add(fill);

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
      // He's authored large for desktop; on narrow screens the copy runs full
      // width, so scale him back down to stay a background element behind it.
      scaleMultiplier = w < 768 ? 0.46 : w < 1100 ? 0.7 : 1;

      measure();
    };

    const target = clonePose(POSES[0]);
    const current = clonePose(POSES[0]);

    const poseFromScroll = (out: Pose) => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const t = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const clamped = Math.min(1, Math.max(0, t));

      let i = 0;
      while (i < stops.length - 2 && clamped > stops[i + 1]) i++;

      const span = stops[i + 1] - stops[i];
      const u = span > 0 ? (clamped - stops[i]) / span : 0;

      return lerpPose(POSES[i], POSES[i + 1], smoothstep(u), out);
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

      poseFromScroll(target);
      Object.assign(current, target);
      applyPose(skel, current);

      if (reduced) {
        // Reduced motion: one static frame in the resting pose. No travel,
        // no idle, no loop.
        applyPose(skel, POSES[0]);
        renderer.render(scene, camera);
        return;
      }

      let last = performance.now();
      let elapsed = 0;

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (!skel) return;

        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;

        poseFromScroll(target);

        // Frame-rate independent damping, so the pose eases toward the scroll
        // target instead of tracking it rigidly. Scalars and limb directions
        // are damped separately — they're different shapes.
        const k = 1 - Math.exp(-6 * dt);

        for (const key of POSE_KEYS) {
          current[key] += (target[key] - current[key]) * k;
        }

        for (const key of POSE_DIRS) {
          const c = current[key];
          const t = target[key];
          c[0] += (t[0] - c[0]) * k;
          c[1] += (t[1] - c[1]) * k;
          c[2] += (t[2] - c[2]) * k;
        }

        applyPose(skel, current);

        // Idle life on top of the pose: a slow float and sway.
        skel.root.position.y += Math.sin(elapsed * 0.9) * 0.05;
        skel.root.rotation.y += Math.sin(elapsed * 0.45) * 0.05;

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
