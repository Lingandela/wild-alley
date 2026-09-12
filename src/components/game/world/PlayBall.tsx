import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { BALL_R3, ballWorld } from "@/game/layout3d";
import { makeBall, stepBall } from "@/game/physics";
import { BALL_R } from "@/game/types";
import { retro } from "@/game/retroMat";
import { simulateThrow, usesFlight } from "@/game/machine";

type Look = "wood" | "heavy" | "superball" | "magnet" | "grease" | "anchor" | "lucky";

function lookOf(game: WildAlleyGame): Look {
  const s = game.session;
  if (s.wants("superball")) return "superball";
  if (s.wants("magnet")) return "magnet";
  if (s.wants("grease")) return "grease";
  if (s.wants("heavy")) return "heavy";
  if (s.wants("anchor")) return "anchor";
  if (s.wants("lucky")) return "lucky";
  return "wood";
}

function BallBody({ look }: { look: Look }) {
  const wood = retro("#ead7b0");
  const stripe = retro("#6a3a28");
  const mats: Record<Look, { body: THREE.MeshLambertMaterial; band: THREE.MeshLambertMaterial; scale: number }> = useMemo(
    () => ({
      wood: { body: wood, band: stripe, scale: 1 },
      heavy: { body: retro("#4a3a30"), band: retro("#1a1410"), scale: 1.2 },
      superball: {
        body: retro("#c45c48", { emissive: "#c45c48", emissiveIntensity: 0.35 }),
        band: retro("#efe6d4"),
        scale: 0.94,
      },
      magnet: {
        body: retro("#8a9aaa", { emissive: "#4a88aa", emissiveIntensity: 0.45 }),
        band: retro("#d0e8f0", { emissive: "#88d0ff", emissiveIntensity: 0.5 }),
        scale: 1,
      },
      grease: { body: retro("#3a3220"), band: retro("#c4a048"), scale: 1 },
      anchor: { body: retro("#2a2420"), band: retro("#6a6058"), scale: 1.08 },
      lucky: {
        body: retro("#d4b060", { emissive: "#c47a3a", emissiveIntensity: 0.3 }),
        band: retro("#efe6d4"),
        scale: 1,
      },
    }),
    [wood, stripe],
  );
  const m = mats[look];
  return (
    <group scale={m.scale}>
      <mesh material={m.body}>
        <sphereGeometry args={[BALL_R3, 14, 12]} />
      </mesh>
      <mesh material={m.band} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[BALL_R3 * 0.72, look === "heavy" ? 0.01 : 0.006, 5, 12]} />
      </mesh>
      {look === "magnet" && (
        <mesh material={retro("#88d0ff", { emissive: "#88d0ff", emissiveIntensity: 0.7 })}>
          <torusGeometry args={[BALL_R3 * 1.05, 0.003, 4, 10]} />
        </mesh>
      )}
      {look === "anchor" && (
        <mesh position={[0, BALL_R3 * 0.7, 0]} material={retro("#6a6058")}>
          <torusGeometry args={[0.012, 0.003, 4, 8]} />
        </mesh>
      )}
      {look === "grease" && (
        <mesh material={retro("#c4a048", { transparent: true, opacity: 0.35 })}>
          <sphereGeometry args={[BALL_R3 * 1.06, 8, 6]} />
        </mesh>
      )}
    </group>
  );
}

function AimGhost({ game }: { game: WildAlleyGame }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const extras = useMemo(() => ({}), []);
  useFrame(() => {
    const s = game.session;
    const inst = mesh.current;
    if (!inst) return;
    const show = (s.phase === "aim" || s.phase === "pick") && !s.walletOpen && s.screen === "play";
    inst.visible = show;
    if (!show) return;
    const p = s.charging ? Math.max(0.18, s.power) : 0.42;
    if (usesFlight(s.lane.theme)) {
      const ghost = simulateThrow({
        power: p,
        aimX: s.aimX,
        holes: s.lane.holes,
        flags: s.flags,
        dt: 0.038,
        maxTime: 1.4,
        record: true,
      });
      const n = 18;
      for (let i = 0; i < n; i++) {
        const sample = ghost.path[Math.min(ghost.path.length - 1, Math.floor((i / n) * ghost.path.length))] ?? ghost.path[0];
        if (!sample) {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const w = ballWorld(s.lane, sample);
        dummy.position.set(w.x, w.y + 0.01, w.z);
        const sc = (s.charging ? 1 : 0.55) * (1 - i / n) * 0.9;
        dummy.scale.setScalar(Math.max(0.2, sc));
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      return;
    }
    const b = makeBall(s.aimX, 0.12, BALL_R);
    b.vy = (1.55 + p * 3.05) * s.flags.launchScale;
    b.vx = s.aimX * 0.22;
    const n = 18;
    for (let i = 0; i < n; i++) {
      stepBall(b, s.world, 0.038, s.flags.restitution, s.flags.friction, extras);
      const w = ballWorld(s.lane, b);
      dummy.position.set(w.x, w.y + 0.01, w.z);
      const sc = (s.charging ? 1 : 0.55) * (1 - i / n) * 0.9;
      dummy.scale.setScalar(Math.max(0.2, sc));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 18]} frustumCulled={false}>
      <sphereGeometry args={[0.02, 6, 5]} />
      <meshBasicMaterial color="#fff6e4" transparent opacity={0.82} depthWrite={false} />
    </instancedMesh>
  );
}

export function PlayBall({ game }: { game: WildAlleyGame }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const s = game.session;
    const look = lookOf(game);
    const groups = [a.current, b.current];
    const split = s.wants("split");
    const staging = s.phase === "aim" || s.phase === "pick" || s.phase === "intro" || s.phase === "demo";
    const pop = s.fxName === "split" ? s.fxT * 0.5 : s.fxT * 0.12;
    const hiddenIntro = s.phase === "intro" && s.introT > 0.4;
    for (let i = 0; i < 2; i++) {
      const mesh = groups[i];
      if (!mesh) continue;
      const ball = s.balls[i];
      const ghostTwin = i === 1 && !ball && split && staging && !!s.balls[0];
      if (hiddenIntro || (!ball && !ghostTwin)) {
        mesh.visible = false;
        continue;
      }
      const src = ball ?? s.balls[0]!;
      if (!src.alive && !staging && s.phase !== "roll" && src.stage !== "sink" && src.stage !== "trough") {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const pull = s.phase === "aim" && s.charging ? s.power * 0.28 : 0;
      const w = ballWorld(s.lane, src);
      const splitOff = ghostTwin ? 0.055 : i === 1 && staging && split && s.balls.length < 2 ? 0.055 : 0;
      const launchSep = s.fxName === "split" && s.phase === "roll" ? (1 - s.fxT) * 0.02 * (i === 0 ? -1 : 1) : 0;
      mesh.position.set(w.x + splitOff * (i === 0 ? -0.15 : 1) + launchSep, w.y, w.z + pull);
      const spd = Math.hypot(src.vx, src.vy);
      const stretch = 1 + Math.min(look === "superball" ? 0.45 : 0.28, spd * 0.07);
      const fat = 1 / Math.sqrt(stretch);
      const pulse = 1 + pop;
      mesh.scale.set(fat * pulse, fat * pulse, stretch * pulse);
      mesh.rotation.x -= src.vy * dt * 3.4;
      mesh.rotation.z += src.vx * dt * 3.4;
    }
  });

  const look = lookOf(game);
  return (
    <>
      <group ref={a}>
        <BallBody look={look} />
      </group>
      <group ref={b} visible={false}>
        <BallBody look={look} />
      </group>
      <AimGhost game={game} />
    </>
  );
}
