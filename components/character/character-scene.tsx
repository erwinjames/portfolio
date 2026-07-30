"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  aimBone,
  buildChair,
  buildDesk,
  buildMacBook,
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

    /** The poses actually driven this session. Desktop uses POSES verbatim;
     *  phones swap the mid-page beats to gap anchors (see measure). */
    let livePoses: Pose[] = POSES.map(clonePose);

    /** Beats that, on phones, anchor to the empty padding gap BELOW their
     *  section instead of the section itself: About, Work, Projects. The
     *  stacked single-column layout leaves no side lanes, so the only place
     *  he can stand without covering words is between the sections. */
    const GAP_BEATS = new Set([1, 2, 3]);
    const isPhone = () => window.innerWidth < 768;

    const measure = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) {
        stops = POSES.map((_, i) => i / (POSES.length - 1));
        return;
      }

      const rects = SECTION_IDS.map((id) =>
        document.getElementById(id)?.getBoundingClientRect(),
      );

      const raw = rects.map((rect, i) => {
        if (!rect) return i / (SECTION_IDS.length - 1);

        // Phones: anchor the gap beats to the midpoint between this section's
        // bottom and the next section's top — pure empty padding.
        if (isPhone() && GAP_BEATS.has(i) && rects[i + 1]) {
          const gap =
            window.scrollY + (rect.bottom + (rects[i + 1] as DOMRect).top) / 2;
          return (gap - window.innerHeight / 2) / maxScroll;
        }

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

    const rebuildPoses = () => {
      livePoses = POSES.map(clonePose);
      if (!isPhone()) return;

      // Gap beats sit near the centre of their gap, offset side to side so
      // consecutive vignettes don't feel stamped. Projects goes LEFT because
      // his pointing arm extends right and would clip the screen edge.
      const gapX: Record<number, number> = { 1: 0.22, 2: -0.22, 3: -0.3 };
      for (const i of GAP_BEATS) {
        livePoses[i].rootX = gapX[i] ?? 0;
        livePoses[i].rootY = 0;
      }
      // Hero: drop him below the tagline into the open bottom half.
      livePoses[0].rootX = 0.6;
      livePoses[0].rootY = -0.52;
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

      rebuildPoses();
      measure();
    };

    const target = clonePose(POSES[0]);
    const current = clonePose(POSES[0]);
    /** Spring velocity, one per scalar field. */
    const velocity: Record<string, number> = {};
    for (const k of POSE_KEYS) velocity[k] = 0;

    // ---- Time-based travel --------------------------------------------------
    // Travel used to be scrubbed by scroll position, which meant a fast wheel
    // flick teleported him across the gap and a nav-link jump snapped him
    // instantly. Now scroll only decides WHICH beat he belongs to (with
    // hysteresis so the boundary doesn't flap); the flight itself always runs
    // on the clock — a fixed-duration eased glide, identical however fast you
    // scroll. Retargeting mid-flight snapshots the rendered state and glides
    // on from there, so chained fast scrolls stay continuous.
    const TRAVEL_S = 1.05;
    /** Commit to the next beat when 58% of the way there; back at 42%. */
    const COMMIT = 0.58;

    let beat = 0;
    let travel = 1; // 0..1 flight progress; 1 = arrived
    let bootstrapped = false;
    const fromSnap = clonePose(POSES[0]);
    let fromOff = 0;

    /** How mid-flight he is: 0 parked, 1 at the midpoint. Feeds the ghost. */
    let dashActivity = 0;

    /** Extra world-Y so he rides WITH the page instead of hanging fixed in
     *  the viewport. Anchored to the active beat's stop: as you scroll past it
     *  he moves up exactly like the content beside him. */
    let docOffsetY = 0;

    /** World units per scrolled pixel at a given character depth. */
    const worldPerPx = (z: number) =>
      (2 * halfHeight * ((CAMERA_Z - z) / CAMERA_Z)) / window.innerHeight;

    const poseFromScroll = (out: Pose, dt: number) => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const t = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const clamped = Math.min(1, Math.max(0, t));

      let i = 0;
      while (i < stops.length - 2 && clamped > stops[i + 1]) i++;

      const span = stops[i + 1] - stops[i];
      const u = span > 0 ? (clamped - stops[i]) / span : 0;

      // Which beat does the viewport belong to right now?
      let desired = beat;
      if (beat === i) desired = u > COMMIT ? i + 1 : i;
      else if (beat === i + 1) desired = u < 1 - COMMIT ? i : i + 1;
      else desired = u > 0.5 ? i + 1 : i; // jumped several sections at once

      if (!bootstrapped) {
        // First sample: appear at the right beat instead of gliding in from
        // the hero — a reload mid-page starts him already in place.
        bootstrapped = true;
        beat = desired;
        travel = 1;
      } else if (desired !== beat) {
        // Depart from exactly what's on screen: snapshot the spring-rendered
        // pose and his current ride offset, then glide toward the new anchor.
        for (const k of POSE_KEYS) fromSnap[k] = current[k];
        for (const k of POSE_DIRS) {
          const c = current[k];
          const f = fromSnap[k];
          f[0] = c[0];
          f[1] = c[1];
          f[2] = c[2];
        }
        fromOff = docOffsetY;
        beat = desired;
        travel = 0;
      }

      travel = Math.min(1, travel + dt / TRAVEL_S);
      const e = smoothstep(travel);
      dashActivity = 4 * e * (1 - e);

      const to = livePoses[beat];
      const ride =
        (window.scrollY - stops[beat] * maxScroll) * worldPerPx(to.rootZ);

      docOffsetY = fromOff + (ride - fromOff) * e;
      return lerpPose(fromSnap, to, e, out);
    };

    const charQuat = new THREE.Quaternion();
    const dir = new THREE.Vector3();

    /** Writes a pose onto the skinned rig. `docOffsetY` rides him with the
     *  page; applied raw (not springed) so he tracks the content 1:1. */
    const applyPose = (skel: Skeleton, pose: Pose) => {
      skel.root.position.set(
        pose.rootX * halfWidth,
        pose.rootY * halfHeight + docOffsetY,
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

      // Props ride on the character root, so they travel, turn, and scale
      // with him; the seated beats fade them in via the pose's `sit`/`desk`.
      const chair = buildChair();
      chair.group.position.set(0, 0.02, -0.02);
      skel.root.add(chair.group);

      const desk = buildDesk();
      desk.group.position.set(0, 0.02, 0);
      skel.root.add(desk.group);

      // The About beat's MacBook, open on his lap while he sits.
      const lap = buildMacBook();
      lap.group.position.set(0, -0.02, 0.3);
      lap.group.rotation.x = THREE.MathUtils.degToRad(4);
      skel.root.add(lap.group);

      // Remapped to the tail of the blend: props only materialise once he's
      // nearly in the beat. Fading linearly dragged ghost furniture across
      // the page for the whole transition.
      const fade = (v: number) => {
        const t = Math.min(1, Math.max(0, (v - 0.65) / 0.35));
        return t * t * (3 - 2 * t);
      };

      const setProps = (sit: number, deskAmount: number, lapAmount: number) => {
        const chairOpacity = fade(sit);
        chair.group.visible = chairOpacity > 0.02;
        for (const m of chair.materials) m.opacity = chairOpacity;

        const deskOpacity = fade(deskAmount);
        desk.group.visible = deskOpacity > 0.02;
        for (const m of desk.materials) m.opacity = deskOpacity;
        // The MacBook screen lights are lights, not materials — fade them
        // too, or a ghost glow lingers on him after the prop is gone.
        desk.screenLight.intensity = deskOpacity * 4.5;

        const lapOpacity = fade(lapAmount);
        lap.group.visible = lapOpacity > 0.02;
        for (const m of lap.materials) m.opacity = lapOpacity;
        lap.screenLight.intensity = lapOpacity * 3;
      };

      poseFromScroll(target, 1);
      Object.assign(current, target);
      for (const k of POSE_DIRS) current[k] = [...target[k]] as typeof current.armL;
      applyPose(skel, current);

      if (reduced) {
        // Reduced motion: one static frame in the resting pose. No travel,
        // no idle, no loop.
        applyPose(skel, livePoses[0]);
        setProps(livePoses[0].sit, livePoses[0].desk, livePoses[0].lap);
        practical.position.set(
          livePoses[0].rootX * halfWidth + 1,
          livePoses[0].rootY * halfHeight + 1,
          2,
        );
        renderer.render(scene, camera);
        return;
      }

      // Timer (r183+) over Clock: it pauses while the tab is hidden, so the
      // page doesn't lurch when you come back to it.
      const timer = new THREE.Timer();

      // ---- Presence fade ----------------------------------------------------
      // He stays planted at FULL presence while you scroll within a section —
      // his dwell spot is that section's empty lane, so he covers nothing.
      // Only while he's actually travelling between beats (the next section
      // has taken the viewport and he's mid-dash across the page) does he
      // recede to a faint ghost, so the trip never covers any details. Faded
      // on the canvas element, not the materials — free, and immune to
      // transparency-sorting artifacts.
      let presence = 1;
      const GHOST = 0.22;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!skel) return;

        timer.update();
        const dt = Math.min(timer.getDelta(), 0.05);
        const elapsed = timer.getElapsed();

        poseFromScroll(target, dt);

        const presenceTarget = 1 - (1 - GHOST) * dashActivity;
        presence += (presenceTarget - presence) * (1 - Math.exp(-6 * dt));
        renderer.domElement.style.opacity = presence.toFixed(3);

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
        setProps(current.sit, current.desk, current.lap);
        desk.updateScreen(elapsed);
        lap.updateScreen(elapsed + 2.7); // out of phase with the desk editor

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
        applyPose(skel, livePoses[0]);
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
