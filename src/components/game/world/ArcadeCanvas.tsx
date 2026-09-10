import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, BallCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { paintSign, retro, useArcadeTextures } from "@/game/retroMat";
import { BALL_R3, BOARD_LEAN, CAB_FRONT, HEAD_H, SPAWN, THROW_Z, boardLocalToWorld, nearCabinet } from "@/game/layout3d";
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
      <mesh position={[0, 0.04, 0]} material={retro("#1a1010")}>
        <boxGeometry args={[1.28, 0.08, 0.7]} />
      </mesh>
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
  const startMap = useMemo(() => paintSign("START", 512, 128), []);
  const vsMap = useMemo(() => paintSign("PASS & PLAY", 512, 96), []);
  const startMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: startMap, emissive: "#c47a3a", emissiveMap: startMap, emissiveIntensity: 0.55 }),
    [startMap],
  );
  const vsMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: vsMap, emissive: "#c45c48", emissiveMap: vsMap, emissiveIntensity: 0.4 }),
    [vsMap],
  );
  const hint = useRef<THREE.MeshLambertMaterial>(null);
  useFrame((_, dt) => {
    const s = game.session;
    const near = s.screen === "menu" && nearCabinet(s.playerX, s.playerZ);
    const want = near ? 0.95 : 0.4;
    startMat.emissiveIntensity += (want - startMat.emissiveIntensity) * Math.min(1, dt * 8);
    if (hint.current) hint.current.emissiveIntensity = near ? 0.7 : 0.15;
  });
  const show = game.session.screen === "menu";
  if (!show) return null;
  const play = (mode: "carnival" | "versus") => {
    game.input.blockLock = true;
    if (mode === "carnival") game.startCarnival();
    else game.startVersus();
  };
  return (
    <group position={[0, 0.62, THROW_Z + CAB_FRONT + 0.03]}>
      <mesh position={[0, 0.02, 0]} material={retro("#1a1010")}>
        <boxGeometry args={[0.52, 0.38, 0.06]} />
      </mesh>
      <mesh
        position={[0, 0.1, 0.04]}
        material={startMat}
        onPointerDown={(e) => {
          e.stopPropagation();
          play("carnival");
        }}
      >
        <boxGeometry args={[0.4, 0.14, 0.04]} />
      </mesh>
      <mesh position={[0, -0.08, 0.04]} material={vsMat} onPointerDown={(e) => { e.stopPropagation(); play("versus"); }}>
        <boxGeometry args={[0.36, 0.09, 0.04]} />
      </mesh>
      <mesh position={[0, -0.22, 0.05]}>
        <boxGeometry args={[0.28, 0.04, 0.02]} />
        <meshLambertMaterial ref={hint} color="#efe6d4" emissive="#efe6d4" emissiveIntensity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0.7]}>
        <ringGeometry args={[0.32, 0.4, 20]} />
        <meshBasicMaterial color="#c47a3a" transparent opacity={0.4} depthWrite={false} />
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
  const p = boardLocalToWorld(0, HEAD_H + 0.08, 0.04);
  return (
    <group position={[p.x, p.y, p.z]} rotation={[-BOARD_LEAN, 0, 0]}>
      <mesh position={[0, 0, -0.04]} material={retro("#2a1410")}>
        <boxGeometry args={[1.12, 0.3, 0.1]} />
      </mesh>
      <mesh ref={mesh} position={[0, 0, 0.02]}>
        <planeGeometry args={[1.05, 0.24]} />
        <meshLambertMaterial color="#efe6d4" emissive="#c47a3a" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function Sim({ game }: { game: WildAlleyGame }) {
  const { gl } = useThree();
  const eHeld = useRef(false);
  const enterHeld = useRef(false);
  const qHeld = useRef(false);
  const chargeLock = useRef(false);
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
    const prevWallet = s.walletOpen;
    game.juice.step(dt);
    s.stepMeta(dt);
    if (s.paused) return;

    const eNow = game.input.has("KeyE");
    if (eNow && !eHeld.current) game.toggleWallet();
    eHeld.current = eNow;

    const lookingDown = s.lookPitch < -0.45 || (s.seated && game.input.down());
    if (lookingDown) s.setLookWallet(true);
    else if (s.lookPitch > -0.22) s.setLookWallet(false);

    game.input.blockLock = s.walletOpen && s.walletPinned;
    if (s.walletPinned && s.walletOpen && document.pointerLockElement) document.exitPointerLock();

    const qNow = game.input.has("KeyQ");
    if (qNow && !qHeld.current) {
      if (s.seated && s.screen === "play") game.standUp();
      else if (s.screen === "play" && !s.seated && nearCabinet(s.playerX, s.playerZ)) game.sitDown();
    }
    qHeld.current = qNow;

    if (s.walletOpen && (s.phase === "pick" || s.phase === "intro" || s.phase === "aim" || s.canSabotage())) {
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
      if (s.screen === "menu" && nearCabinet(s.playerX, s.playerZ)) {
        game.startCarnival();
      } else if (s.screen === "play" && !s.seated && nearCabinet(s.playerX, s.playerZ)) {
        game.sitDown();
      } else if (s.phase === "tally") s.skipTally();
      else if (s.phase === "pick" || s.phase === "intro") s.readyThrow();
      else if (s.phase === "handoff") s.finishHandoff();
      game.onUi();
    }
    enterHeld.current = enter;

    if (s.phase === "demo") s.tickDemo(dt);

    const wantThrow = game.input.up();
    if ((s.phase === "pick" || s.phase === "intro") && s.seated && !s.walletOpen && wantThrow && !chargeLock.current) {
      game.ready();
      chargeLock.current = true;
    }
    if (!wantThrow) chargeLock.current = false;

    if (s.phase === "aim" && !s.walletOpen && s.seated && !chargeLock.current) {
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

    if (prev !== s.phase || prevWallet !== s.walletOpen) game.onUi();
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
      <color attach="background" args={["#2a1a12"]} />
      <fog attach="fog" args={["#2a1a12", 22, 44]} />
      <ambientLight intensity={0.64} color="#ead8c0" />
      <hemisphereLight args={["#9a8078", "#2a1810", 0.62]} />
      <spotLight position={[0, 3.8, 0.8]} angle={0.58} penumbra={0.55} intensity={58} distance={20} color="#ffe8c8" />
      <spotLight position={[0, 3.5, -4.2]} angle={0.55} penumbra={0.5} intensity={46} distance={16} color="#ffd8a0" />
      <spotLight position={[3.2, 3.2, 1.8]} angle={0.72} penumbra={0.7} intensity={24} distance={14} color="#ffd0b0" />
      <spotLight position={[-3.2, 3.2, -1.6]} angle={0.72} penumbra={0.7} intensity={22} distance={14} color="#e8c8a0" />
      <spotLight position={[0, 3.4, 4.0]} angle={0.7} penumbra={0.7} intensity={18} distance={12} color="#f0d8b8" />
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
      camera={{ fov: 62, position: [SPAWN.x, SPAWN.y + 0.68, SPAWN.z], near: 0.08, far: 52 }}
      className="h-full w-full touch-none"
      style={{ imageRendering: "pixelated" }}
      onCreated={({ gl, camera }) => {
        gl.setPixelRatio(1);
        gl.toneMapping = THREE.NoToneMapping;
        gl.setClearColor("#2a1a12", 1);
        camera.near = 0.08;
        camera.far = 52;
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
        <color attach="background" args={["#2a1a12"]} />
        <Physics gravity={[0, -16, 0]} timeStep={1 / 60} interpolate>
          <Scene game={game} view={view} />
        </Physics>
      </Suspense>
    </Canvas>
  );
});
