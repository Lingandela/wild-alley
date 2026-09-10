import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, BallCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { paintSign, retro, useArcadeTextures } from "@/game/retroMat";
import { BALL_R3, CAB_FRONT, SPAWN, THROW_Z, boardOrigin } from "@/game/layout3d";
import { Room } from "./Room";
import { LaneMachine } from "./LaneMachine";
import { Wallet } from "./Wallet";
import { Player } from "./Player";
import { PlayBall } from "./PlayBall";
import { AbilityFX } from "./AbilityFX";

function LowRes() {
  const { gl } = useThree();
  useEffect(() => {
    const apply = () => {
      const r = gl.domElement.getBoundingClientRect();
      const w = 960;
      const h = Math.max(540, Math.round((960 * r.height) / Math.max(1, r.width)));
      gl.setPixelRatio(1);
      gl.toneMapping = THREE.NoToneMapping;
      gl.setSize(w, h, false);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [gl]);
  return null;
}

function BonusPlay({ game }: { game: WildAlleyGame }) {
  const body = useRef<RapierRigidBody>(null);
  const started = useRef(false);
  useFrame((_, raw) => {
    const s = game.session;
    if (s.phase !== "bonus" || !s.bonus) {
      started.current = false;
      return;
    }
    const dt = Math.min(raw, 0.1);
    const side = s.bonus.kind === "pinball" ? -3.35 : 3.35;
    if (!started.current && body.current) {
      started.current = true;
      body.current.setTranslation({ x: side + 0.04, y: 2.55, z: -1.15 }, true);
      body.current.setLinvel({ x: 0.12, y: 0, z: 0 }, true);
      body.current.applyImpulse({ x: 0.18, y: 0.08, z: s.bonus.kind === "pinball" ? -0.45 : 0.08 }, true);
    }
    const t = body.current?.translation();
    if (!t) return;
    if (s.bonus.kind === "plinko" && t.y < 0.58) {
      const slots = [40, 80, 20, 120, 10, 30];
      const idx = Math.max(0, Math.min(5, Math.floor((t.x - side + 0.45) / 0.15)));
      const chips = slots[idx] ?? 40;
      s.completeBonus(chips, idx === 2 ? 1 : 0);
      game.audio.chime(chips);
      game.onUi();
    }
    if (s.bonus.kind === "pinball") {
      s.bonus.time += dt;
      if (game.input.up() || game.input.pointerDown) {
        body.current?.applyImpulse({ x: 0, y: 0.42, z: -0.52 }, true);
      }
      if (t.y < 0.5 || s.bonus.time > 7) {
        s.completeBonus(Math.max(8, Math.floor(s.bonus.chips || 40)), 0);
        game.audio.chime(40);
        game.onUi();
      }
    }
  });

  const s = game.session;
  const active = s.phase === "bonus";
  const side = s.bonus?.kind === "pinball" ? -3.35 : 3.35;
  const pegs = useMemo(() => {
    const list: { x: number; y: number; z: number }[] = [];
    for (let r = 0; r < 5; r++) {
      const n = 5 + (r % 2);
      for (let i = 0; i < n; i++) {
        list.push({ x: side + (i - (n - 1) / 2) * 0.16, y: 2.15 - r * 0.22, z: -1.25 });
      }
    }
    return list;
  }, [side]);

  if (!active) {
    return (
      <group>
        <BonusCabinet x={-3.35} kind="pinball" />
        <BonusCabinet x={3.35} kind="plinko" />
      </group>
    );
  }

  return (
    <group>
      <BonusCabinet x={-3.35} kind="pinball" />
      <BonusCabinet x={3.35} kind="plinko" />
      <RigidBody type="fixed" colliders={false} position={[side, 1.2, -1.25]}>
        <CuboidCollider args={[0.55, 0.04, 0.22]} position={[0, -0.7, 0]} />
        <CuboidCollider args={[0.04, 1.2, 0.22]} position={[-0.52, 0.4, 0]} />
        <CuboidCollider args={[0.04, 1.2, 0.22]} position={[0.52, 0.4, 0]} />
      </RigidBody>
      {pegs.map((p, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[p.x, p.y, p.z]} restitution={0.9}>
          <BallCollider args={[0.04]} />
          <mesh material={retro("#efe6d4")}>
            <sphereGeometry args={[0.04, 6, 5]} />
          </mesh>
        </RigidBody>
      ))}
      <RigidBody ref={body} colliders={false} position={[side, 2.7, -1.1]} ccd restitution={0.7}>
        <BallCollider args={[BALL_R3]} />
        <mesh material={retro("#ead7b0")}>
          <sphereGeometry args={[BALL_R3, 10, 8]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

function BonusCabinet({ x, kind }: { x: number; kind: "plinko" | "pinball" }) {
  const body = retro(kind === "pinball" ? "#24182e" : "#1a2030");
  const face = retro("#2a2030");
  return (
    <group position={[x, 0, -1.25]}>
      <mesh position={[0, 1.15, 0]} material={body}>
        <boxGeometry args={[1.15, 2.3, 0.55]} />
      </mesh>
      <mesh position={[0, 1.35, 0.28]} material={face}>
        <boxGeometry args={[0.95, 1.7, 0.06]} />
      </mesh>
      <mesh position={[0, 2.38, 0.2]} material={retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.45 })}>
        <boxGeometry args={[1.05, 0.12, 0.3]} />
      </mesh>
    </group>
  );
}

function CabinetPlates({ game }: { game: WildAlleyGame }) {
  const startMap = useMemo(() => paintSign("START CARNIVAL", 512, 96), []);
  const vsMap = useMemo(() => paintSign("PASS & PLAY", 512, 96), []);
  const startMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: startMap, emissive: "#c47a3a", emissiveMap: startMap, emissiveIntensity: 0.4 }),
    [startMap],
  );
  const vsMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: vsMap, emissive: "#c45c48", emissiveMap: vsMap, emissiveIntensity: 0.35 }),
    [vsMap],
  );
  const show = game.session.screen === "menu";
  if (!show) return null;
  return (
    <group position={[0, 0.72, THROW_Z + CAB_FRONT + 0.02]}>
      <mesh
        position={[0, 0.08, 0]}
        material={startMat}
        onClick={(e) => {
          e.stopPropagation();
          game.startCarnival();
        }}
      >
        <boxGeometry args={[0.62, 0.12, 0.04]} />
      </mesh>
      <mesh
        position={[0, -0.08, 0]}
        material={vsMat}
        onClick={(e) => {
          e.stopPropagation();
          game.startVersus();
        }}
      >
        <boxGeometry args={[0.52, 0.1, 0.04]} />
      </mesh>
    </group>
  );
}

function ScoreLamp({ game }: { game: WildAlleyGame }) {
  const mesh = useRef<THREE.Mesh>(null);
  const last = useRef("");
  useFrame(() => {
    const s = game.session;
    const text =
      s.screen === "play"
        ? s.mode === "versus"
          ? `${s.scores[0]}  ${s.scores[1]}`
          : String(s.scores[0])
        : s.lane.name.toUpperCase();
    if (text === last.current || !mesh.current) return;
    last.current = text;
    const map = paintSign(text, 512, 96);
    const mat = mesh.current.material as THREE.MeshLambertMaterial;
    mat.map = map;
    mat.emissiveMap = map;
    mat.needsUpdate = true;
  });
  return (
    <mesh ref={mesh} position={[0, boardOrigin().y + 1.22, boardOrigin().z + 0.06]}>
      <planeGeometry args={[1.05, 0.24]} />
      <meshLambertMaterial color="#efe6d4" emissive="#c47a3a" emissiveIntensity={0.55} />
    </mesh>
  );
}

function Sim({ game }: { game: WildAlleyGame }) {
  const { gl } = useThree();
  const eHeld = useRef(false);
  const enterHeld = useRef(false);
  useEffect(() => {
    game.input.bind(gl.domElement);
    return () => game.input.unbind();
  }, [game, gl]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    if (game.juice.hitstop > 0) {
      game.juice.step(dt);
      return;
    }
    const s = game.session;
    const prev = s.phase;
    game.juice.step(dt);
    s.stepMeta(dt);
    if (s.paused) return;

    game.input.blockLock = s.walletOpen;
    if (s.walletOpen && document.pointerLockElement) document.exitPointerLock();

    const eNow = game.input.has("KeyE");
    if (eNow && !eHeld.current) game.toggleWallet();
    eHeld.current = eNow;

    if (s.walletOpen && (s.phase === "pick" || s.canSabotage())) {
      for (let d = 0; d < 5; d++) {
        const code = `Digit${d + 1}`;
        if (game.input.has(code)) {
          const list = s.canSabotage() ? s.sabotageHands[1 - s.player]! : s.hand;
          const card = list[d];
          if (card) {
            if (s.canSabotage()) game.sabotage(card.uid);
            else game.toggleCard(card.uid);
          }
          game.input.keys.delete(code);
        }
      }
    }

    const enter = game.input.has("Enter");
    if (enter && !enterHeld.current) {
      if (s.phase === "tally") s.skipTally();
      else if (s.phase === "pick" || s.phase === "intro") s.readyThrow();
      else if (s.phase === "handoff") s.finishHandoff();
      game.onUi();
    }
    enterHeld.current = enter;

    if (s.phase === "demo") s.tickDemo(dt);

    if ((s.phase === "pick" || s.phase === "intro" || s.phase === "handoff") && game.input.up() && !s.walletOpen) {
      if (s.phase === "handoff") s.finishHandoff();
      s.readyThrow();
    }

    if (s.phase === "aim" && !s.walletOpen) {
      const steer = (game.input.left() ? -1 : 0) + (game.input.right() ? 1 : 0);
      s.aimX += steer * 0.55 * dt;
      s.aimX = Math.max(-s.lane.rail + 0.08, Math.min(s.lane.rail - 0.08, s.aimX));
      if (game.input.left()) s.nudgeHeading(2.5 * dt);
      if (game.input.right()) s.nudgeHeading(-2.5 * dt);
      if (s.balls[0]) {
        s.balls[0].x = s.aimX;
        s.balls[0].y = 0.12;
        s.balls[0].vx = 0;
        s.balls[0].vy = 0;
        s.balls[0].alive = true;
      }
      if (game.input.pointerDown) {
        const drag = (game.input.py - game.input.sy) / Math.max(1, gl.domElement.height);
        s.power = Math.min(1, Math.max(0, drag * 2.4));
        s.charging = true;
        const nx = (game.input.px / Math.max(1, gl.domElement.width) - 0.5) * s.lane.rail * 2;
        s.aimX = Math.max(-s.lane.rail + 0.08, Math.min(s.lane.rail - 0.08, nx));
      } else if (s.charging && !game.input.pointerDown && !game.input.up()) {
        if (s.power > 0.14) {
          const split = s.flags.split;
          s.launch(s.power, s.aimX * 0.22);
          if (split) game.audio.split();
          else game.audio.whoosh(s.power);
          game.onUi();
        }
        s.charging = false;
      }
      if (game.input.up()) {
        s.charging = true;
        s.power = Math.min(1, s.power + dt * 0.95);
      } else if (s.charging && s.power > 0.1 && !game.input.pointerDown) {
        s.launch(s.power, s.aimX * 0.25);
        if (s.flags.split) game.audio.split();
        else game.audio.whoosh(s.power);
        game.onUi();
        s.charging = false;
      }
    }

    if (s.phase === "roll") {
      s.stepRoll(dt, { left: game.input.left(), right: game.input.right(), up: game.input.up() });
      if (game.input.left()) s.nudgeHeading(2.5 * dt);
      if (game.input.right()) s.nudgeHeading(-2.5 * dt);
    }

    for (const hit of s.consumeHits()) {
      if (hit.kind === "bumper") game.audio.bumper();
      else if (hit.kind === "peg") game.audio.peg();
      else if (hit.kind === "spinner") game.audio.peg();
      else game.audio.wood(hit.mag);
    }
    if (s.justSank === "gutter") {
      game.audio.gutter();
      s.justSank = null;
    } else if (typeof s.justSank === "number") {
      game.audio.chime(s.justSank);
      game.juice.addTrauma(s.justSank >= 50 ? 0.4 : 0.16);
      s.justSank = null;
    }

    if (game.input.has("Escape") && s.screen === "play" && !game.input.locked) {
      s.paused = !s.paused;
      game.input.keys.delete("Escape");
      game.onUi();
    }

    if (prev !== s.phase) game.onUi();
    game.uiClock += dt;
    if (game.uiClock > 0.1) {
      game.uiClock = 0;
      game.onUi();
    }
  });
  return null;
}

function Scene({ game, view }: { game: WildAlleyGame; view: string }) {
  const tex = useArcadeTextures();
  void view;
  const lane = game.session.lane;
  return (
    <>
      <LowRes />
      <color attach="background" args={["#1a100e"]} />
      <fog attach="fog" args={["#1a100e", 14, 26]} />
      <ambientLight intensity={0.42} color="#e4d0b4" />
      <hemisphereLight args={["#6a5868", "#241610", 0.42]} />
      <spotLight position={[0, 3.05, 0.4]} angle={0.5} penumbra={0.62} intensity={48} distance={16} color="#ffe6c0" />
      <spotLight position={[0, 2.7, -3.0]} angle={0.48} penumbra={0.5} intensity={40} distance={11} color="#ffd090" />
      <spotLight position={[0, 2.2, 2.2]} angle={0.55} penumbra={0.7} intensity={18} distance={8} color="#ffd8b0" />
      <Room tex={tex} />
      <group key={lane.id}>
        <LaneMachine lane={lane} tex={tex} game={game} />
      </group>
      <PlayBall game={game} />
      <AbilityFX game={game} />
      <BonusPlay game={game} />
      <CabinetPlates game={game} />
      <ScoreLamp game={game} />
      <Player game={game} />
      <Wallet game={game} leather={tex.leather} suede={tex.suede} />
      <Sim game={game} />
    </>
  );
}

export const ArcadeCanvas = memo(function ArcadeCanvas({ game, view }: { game: WildAlleyGame; view: string }) {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ fov: 62, position: [SPAWN.x, SPAWN.y + 0.68, SPAWN.z], near: 0.08, far: 36 }}
      className="h-full w-full touch-none"
      style={{ imageRendering: "pixelated" }}
      onCreated={({ gl, camera }) => {
        gl.setPixelRatio(1);
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor("#1a100e", 1);
        camera.near = 0.08;
        camera.far = 36;
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 64;
          camera.updateProjectionMatrix();
        }
        camera.lookAt(0, 1.05, -3.2);
        const canvas = gl.domElement;
        const onLost = (e: Event) => e.preventDefault();
        canvas.addEventListener("webglcontextlost", onLost, false);
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#1a100e"]} />
        <Physics gravity={[0, -16, 0]} timeStep={1 / 60} interpolate>
          <Scene game={game} view={view} />
        </Physics>
      </Suspense>
    </Canvas>
  );
});
