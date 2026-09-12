import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody, interactionGroups } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { holeRing, paintCupLabel, paintSign, paintSkeeFace, paintStub, retro, retroMapped, retroSign, type ArcadeTextures } from "@/game/retroMat";
import {
  BALL_R3,
  BOARD_LEAN,
  CAB_FRONT,
  CAB_W,
  COL,
  FACE_CY,
  FACE_R,
  FLAT,
  HALF_W,
  HEAD_H,
  HEAD_W,
  PLAY_Y,
  RAMP_RISE,
  RAMP_RUN,
  SKEE_RINGS,
  THROW_Z,
  boardOrigin,
  bumperWorld,
  crateWorld,
  hillWorld,
  holeWorld,
  rampEndZ,
  rampStartZ,
  themeCabinet,
  themeFelt,
  usesBackboard,
  usesFlight,
  xWorld,
} from "@/game/layout3d";
import { CLASSIC, rampSegments } from "@/game/machine";
import type { LaneDef } from "@/game/types";
import { easeOutBack } from "@/game/anim";

const STATIC = interactionGroups([COL.static], [COL.player, COL.static]);
const WOOD = { friction: 0.55, restitution: 0.08 };

function PopIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(-delay);
  useFrame((_, dt) => {
    t.current += dt;
    const u = Math.max(0, Math.min(1, t.current / 0.38));
    const s = u <= 0 ? 0 : easeOutBack(u);
    if (ref.current) {
      ref.current.scale.setScalar(s);
      ref.current.visible = u > 0.02;
    }
  });
  return (
    <group ref={ref} scale={0} visible={false}>
      {children}
    </group>
  );
}

function DropCrate({ x, y, z, w, hh, d }: { x: number; y: number; z: number; w: number; hh: number; d: number }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const u = Math.min(1, t.current / 0.45);
    const drop = (1 - u) * (1 - u);
    if (ref.current) {
      ref.current.position.y = y + drop * 0.55;
      ref.current.rotation.x = (1 - u) * 0.4;
    }
  });
  return (
    <group ref={ref} position={[x, y + 0.55, z]}>
      <mesh material={retro("#6a4430")}>
        <boxGeometry args={[w, hh, d]} />
      </mesh>
      <mesh position={[0, hh * 0.52, 0]} material={retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.4 })}>
        <boxGeometry args={[w * 0.7, 0.012, d * 0.7]} />
      </mesh>
    </group>
  );
}

function makeSkeeShape(holes: LaneDef["holes"]) {
  const shape = new THREE.Shape();
  shape.absarc(0, FACE_CY, FACE_R, 0, Math.PI * 2, false);
  for (const h of holes) {
    const lx = h.faceX ?? 0;
    const ly = h.faceY ?? FACE_CY;
    const r = (h.faceR ?? h.r) * 0.95;
    if (Math.hypot(lx, ly - FACE_CY) + r > FACE_R - 0.012) continue;
    const hole = new THREE.Path();
    hole.absarc(lx, ly, r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

function SkeeFaceDisk({ holes, material }: { holes: LaneDef["holes"]; material: THREE.Material }) {
  const geo = useMemo(() => new THREE.ShapeGeometry(makeSkeeShape(holes), 56), [holes]);
  return <mesh geometry={geo} position={[0, 0, 0.012]} material={material} />;
}

function Num({ text, position, w = 0.16, h = 0.1 }: { text: string; position: [number, number, number]; w?: number; h?: number }) {
  const mat = useMemo(
    () =>
      retroSign("#1a0808", {
        map: paintSign(text, 256, 192, "#fff6e4", "#c47a3a"),
        emissive: "#fff6e4",
        emissiveIntensity: 0.55,
      }),
    [text],
  );
  return (
    <mesh position={position} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function SkeeCup({ lane, index }: { lane: LaneDef; index: number }) {
  const h = lane.holes[index]!;
  const w = holeWorld(lane, h);
  const col = holeRing(h.value);
  const wall = retro("#c4a078", { emissive: "#8a5a38", emissiveIntensity: 0.4 });
  const rim = retro("#fff6e4", { emissive: col, emissiveIntensity: 0.75 });
  const label = String(h.label ?? h.value);
  const plate = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: paintCupLabel(label),
      color: "#ffffff",
    });
    return m;
  }, [label]);
  if (!w.onBoard) {
    return (
      <group position={[w.x, w.y, w.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={wall}>
          <cylinderGeometry args={[w.r * 0.9, w.r * 0.72, 0.06, 14, 1, true]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={rim}>
          <ringGeometry args={[w.r * 0.7, w.r * 1.12, 16]} />
        </mesh>
        <Num text={label} position={[0, 0.02, w.r + 0.1]} />
      </group>
    );
  }
  const side = (h.faceX ?? 0) !== 0 ? Math.sign(h.faceX!) * (w.r + 0.14) : w.r + 0.14;
  return (
    <group position={[w.lx, w.ly, 0.03]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.05]} material={wall}>
        <cylinderGeometry args={[w.r * 0.96, w.r * 0.8, 0.12, 18, 1, true]} />
      </mesh>
      <mesh material={rim}>
        <ringGeometry args={[w.r * 0.7, w.r * 1.28, 24]} />
      </mesh>
      <mesh position={[0, 0, 0.006]} material={rim}>
        <torusGeometry args={[w.r * 0.98, 0.01, 8, 22]} />
      </mesh>
      <mesh position={[side, 0, 0.012]} material={plate}>
        <planeGeometry args={[0.16, 0.11]} />
      </mesh>
    </group>
  );
}

function Spinner({ lane, index }: { lane: LaneDef; index: number }) {
  const sp = lane.spinners[index]!;
  const ref = useRef<RapierRigidBody>(null);
  const x = xWorld(lane, sp.x);
  const z = holeWorld(lane, { x: sp.x, y: sp.y, r: 0.05, value: 0 }).z;
  const golf = lane.theme === "golf";
  useFrame(() => {
    const body = ref.current;
    if (!body) return;
    const q = { x: 0, y: Math.sin(sp.angle / 2), z: 0, w: Math.cos(sp.angle / 2) };
    body.setNextKinematicRotation(q);
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={[x, PLAY_Y + (golf ? 0.28 : 0.1), z]} collisionGroups={STATIC}>
      <CuboidCollider args={[sp.len * 1.1, golf ? 0.08 : 0.03, 0.03]} />
      <mesh material={retro(golf ? "#c45c48" : "#efe6d4")}>
        <boxGeometry args={[sp.len * 2.2, 0.05, 0.06]} />
      </mesh>
      <mesh material={retro(golf ? "#efe6d4" : "#c45c48")}>
        <boxGeometry args={[0.06, 0.05, sp.len * 2.2]} />
      </mesh>
    </RigidBody>
  );
}

function ReturnRack({ game }: { game: WildAlleyGame }) {
  const group = useRef<THREE.Group>(null);
  const wood = retro("#ead7b0");
  useFrame(() => {
    const s = game.session;
    const g = group.current;
    if (!g) return;
    const unloading = s.phase === "intro";
    const k = unloading ? 1 - s.introT / 1.8 : 1;
    const onDeck = s.phase === "aim" || s.phase === "pick" || s.phase === "intro" || s.phase === "roll";
    const n = Math.max(0, s.screen === "menu" ? 4 : s.ballsLeft - (onDeck && s.introT < 0.45 ? 1 : 0));
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i] as THREE.Mesh;
      const show = i < n;
      m.visible = show;
      if (!show) continue;
      const dest = THROW_Z - 0.22 - i * 0.14;
      const start = THROW_Z - FLAT * 0.55 - i * 0.05;
      const z = start + (dest - start) * Math.min(1, k * 1.15);
      m.position.set(HALF_W + 0.16, PLAY_Y - 0.02, z);
      m.rotation.x = z * 12;
    }
  });
  return (
    <group ref={group}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} material={wood} visible={false}>
          <sphereGeometry args={[BALL_R3, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function TableTickets({ game }: { game: WildAlleyGame }) {
  const s = game.session;
  const cards = s.hand.filter((c) => s.selected.includes(c.uid));
  if (cards.length === 0 || s.screen !== "play") return null;
  return (
    <group>
      {cards.map((c, i) => {
        const map = paintStub(c.name, c.type, true);
        return (
          <mesh
            key={c.uid}
            position={[-0.22 + i * 0.08, PLAY_Y + 0.022, THROW_Z + 0.12]}
            rotation={[-Math.PI / 2, 0, -0.08 + i * 0.05]}
            onPointerOver={(e) => {
              e.stopPropagation();
              s.setHover(c.uid);
              game.onUi();
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              s.setHover(null);
              game.onUi();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              game.input.blockLock = true;
              if (s.phase === "pick" || s.phase === "aim") game.toggleCard(c.uid);
            }}
          >
            <planeGeometry args={[0.07, 0.02]} />
            <meshBasicMaterial map={map} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

export function LaneMachine({
  lane,
  tex,
  game,
}: {
  lane: LaneDef;
  tex: ArcadeTextures;
  game: WildAlleyGame;
}) {
  const maple = useMemo(() => retroMapped(tex.wood, "#f6dcb0"), [tex.wood]);
  const pal = themeCabinet(lane.theme);
  const feltCol = themeFelt(lane.theme);
  const body = retro(pal.body);
  const stripe = retro(pal.stripe);
  const dark = retro("#140c0c");
  const cream = retro("#efe6d4");
  const gold = retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.35 });
  const railL = retro("#c45c48");
  const railR = retro("#efe6d4");
  const felt = retro(feltCol, { emissive: feltCol, emissiveIntensity: 0.08 });
  const faceMap = useMemo(() => paintSkeeFace(), []);
  const faceMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map: faceMap,
        color: "#ffffff",
        emissive: "#2a140c",
        emissiveMap: faceMap,
        emissiveIntensity: 0.14,
        flatShading: true,
      }),
    [faceMap],
  );
  const board = usesBackboard(lane.theme);
  const flight = usesFlight(lane.theme);
  const half = HALF_W;
  const zLip = rampStartZ();
  const zEnd = rampEndZ();
  const slope = Math.hypot(RAMP_RUN, RAMP_RISE);
  const tilt = Math.atan(RAMP_RISE / RAMP_RUN);
  const origin = boardOrigin(lane.theme);
  const gap = flight ? CLASSIC.flightGap : 0.02;
  const cabLen = FLAT + RAMP_RUN + gap + CAB_FRONT + 0.7;
  const cabZ = THROW_Z + CAB_FRONT / 2 - cabLen / 2;
  const curve = useMemo(() => rampSegments(7), []);
  const marquee = useMemo(
    () => retroSign("#efe6d4", { map: paintSign(lane.name.toUpperCase(), 512, 96), emissive: "#c47a3a", emissiveIntensity: 0.7 }),
    [lane.name],
  );
  const lamps = useRef<THREE.Mesh[]>([]);
  const lampMats = useMemo(
    () =>
      Array.from({ length: 8 }, () =>
        new THREE.MeshLambertMaterial({
          color: "#2a1814",
          emissive: "#c45c48",
          emissiveIntensity: 0.05,
          flatShading: true,
        }),
      ),
    [],
  );
  useFrame(() => {
    const p = game.session.charging ? game.session.power : 0;
    const n = Math.round(p * 8);
    for (let i = 0; i < lamps.current.length; i++) {
      const m = lamps.current[i];
      if (!m) continue;
      const on = i < n;
      const mat = lampMats[i];
      if (!mat) continue;
      mat.emissiveIntensity = on ? 0.95 : 0.05;
      mat.color.set(on ? "#c45c48" : "#2a1814");
    }
  });

  const laneSurf = lane.theme === "golf" ? retro("#3d6a42", { emissive: "#2a4a30", emissiveIntensity: 0.18 }) : maple;
  const ringMat = retro("#efe6d4");

  return (
    <group>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} {...WOOD}>
        <CuboidCollider args={[CAB_W / 2, 0.42, cabLen / 2]} position={[0, 0.42, cabZ]} />
        <CuboidCollider args={[half + 0.06, 0.08, FLAT / 2]} position={[0, PLAY_Y - 0.06, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[0.04, 0.08, FLAT / 2]} position={[-half - 0.04, PLAY_Y + 0.04, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[0.04, 0.08, FLAT / 2]} position={[half + 0.04, PLAY_Y + 0.04, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[CAB_W / 2, 0.7, 0.12]} position={[0, 1.1, origin.z + 0.06]} />
      </RigidBody>

      <mesh position={[0, 0.4, cabZ]} material={body}>
        <boxGeometry args={[CAB_W, 0.8, cabLen]} />
      </mesh>
      <mesh position={[-CAB_W / 2 - 0.015, 0.52, cabZ]} material={stripe}>
        <boxGeometry args={[0.04, 0.1, cabLen]} />
      </mesh>
      <mesh position={[CAB_W / 2 + 0.015, 0.52, cabZ]} material={stripe}>
        <boxGeometry args={[0.04, 0.1, cabLen]} />
      </mesh>
      <mesh position={[0, 0.46, THROW_Z + CAB_FRONT - 0.02]} material={dark}>
        <boxGeometry args={[CAB_W - 0.1, 0.55, 0.05]} />
      </mesh>

      <mesh position={[0, PLAY_Y - 0.03, THROW_Z - FLAT / 2]} material={laneSurf}>
        <boxGeometry args={[half * 2, 0.06, FLAT]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAY_Y + 0.002, THROW_Z - FLAT / 2]} material={laneSurf}>
        <planeGeometry args={[half * 2 - 0.02, FLAT - 0.02]} />
      </mesh>
      <mesh position={[0, PLAY_Y + 0.006, THROW_Z - 0.08]} material={cream}>
        <boxGeometry args={[half * 2 - 0.04, 0.004, 0.018]} />
      </mesh>
      <mesh position={[-half - 0.025, PLAY_Y + 0.028, THROW_Z - FLAT / 2]} material={railL}>
        <boxGeometry args={[0.05, 0.055, FLAT]} />
      </mesh>
      <mesh position={[half + 0.025, PLAY_Y + 0.028, THROW_Z - FLAT / 2]} material={railR}>
        <boxGeometry args={[0.05, 0.055, FLAT]} />
      </mesh>

      {flight ? (
        <>
          {curve.map((s, i) => (
            <group key={`ramp${i}`} position={[0, s.midY, s.midZ]} rotation={[s.tilt, 0, 0]}>
              <mesh material={laneSurf}>
                <boxGeometry args={[half * 2 + 0.02, 0.055, s.len]} />
              </mesh>
              <mesh position={[-half - 0.025, 0.03, 0]} material={railL}>
                <boxGeometry args={[0.05, 0.055, s.len]} />
              </mesh>
              <mesh position={[half + 0.025, 0.03, 0]} material={railR}>
                <boxGeometry args={[0.05, 0.055, s.len]} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          <mesh position={[0, PLAY_Y + RAMP_RISE / 2, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={laneSurf}>
            <boxGeometry args={[half * 2 + 0.02, 0.055, slope]} />
          </mesh>
          <mesh position={[-half - 0.025, PLAY_Y + RAMP_RISE / 2 + 0.03, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={railL}>
            <boxGeometry args={[0.05, 0.055, slope]} />
          </mesh>
          <mesh position={[half + 0.025, PLAY_Y + RAMP_RISE / 2 + 0.03, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={railR}>
            <boxGeometry args={[0.05, 0.055, slope]} />
          </mesh>
        </>
      )}
      <mesh position={[0, PLAY_Y + RAMP_RISE + 0.01, zEnd + 0.02]} material={gold}>
        <boxGeometry args={[half * 2 + 0.08, 0.03, 0.04]} />
      </mesh>

      {flight && (
        <>
          <mesh position={[-half - 0.03, PLAY_Y + RAMP_RISE + 0.07, (zEnd + origin.z) / 2]} material={body}>
            <boxGeometry args={[0.05, 0.16, Math.max(0.12, zEnd - origin.z)]} />
          </mesh>
          <mesh position={[half + 0.03, PLAY_Y + RAMP_RISE + 0.07, (zEnd + origin.z) / 2]} material={body}>
            <boxGeometry args={[0.05, 0.16, Math.max(0.12, zEnd - origin.z)]} />
          </mesh>
          <mesh position={[0, PLAY_Y + 0.28, (zEnd + origin.z) / 2]} material={dark}>
            <boxGeometry args={[half * 2 + 0.04, 0.08, Math.max(0.12, zEnd - origin.z - 0.04)]} />
          </mesh>
          <mesh position={[-HEAD_W / 2 + 0.08, 0.7, origin.z + 0.08]} material={body}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
          </mesh>
          <mesh position={[HEAD_W / 2 - 0.08, 0.7, origin.z + 0.08]} material={body}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
          </mesh>
        </>
      )}

      <mesh position={[half + 0.16, PLAY_Y - 0.1, THROW_Z - (FLAT + RAMP_RUN + gap) * 0.45]} material={dark}>
        <boxGeometry args={[0.18, 0.12, (FLAT + RAMP_RUN + gap) * 0.82]} />
      </mesh>
      <mesh position={[half + 0.16, PLAY_Y - 0.04, THROW_Z - (FLAT + RAMP_RUN + gap) * 0.45]} material={dark}>
        <boxGeometry args={[0.12, 0.04, (FLAT + RAMP_RUN + gap) * 0.78]} />
      </mesh>
      <ReturnRack game={game} />

      {board && (
        <group position={[origin.x, origin.y, origin.z]} rotation={[-BOARD_LEAN, 0, 0]}>
          <mesh position={[0, HEAD_H / 2 - 0.04, -0.1]} material={body}>
            <boxGeometry args={[HEAD_W, HEAD_H, 0.2]} />
          </mesh>
          <mesh position={[0, HEAD_H - 0.02, -0.04]} material={stripe}>
            <boxGeometry args={[HEAD_W + 0.04, 0.08, 0.22]} />
          </mesh>
          <SkeeFaceDisk holes={lane.holes} material={faceMat} />
          <mesh position={[0, FACE_CY, 0.03]}>
            <torusGeometry args={[FACE_R + 0.035, 0.038, 8, 32]} />
            <meshLambertMaterial color="#6a241c" flatShading />
          </mesh>
          {SKEE_RINGS.map((r) => (
            <mesh key={r} position={[0, FACE_CY, 0.03]} material={ringMat}>
              <torusGeometry args={[r, 0.02, 8, 32]} />
            </mesh>
          ))}
          {lane.holes.map((_, i) => (
            <SkeeCup key={i} lane={lane} index={i} />
          ))}
          <mesh position={[0, HEAD_H - 0.08, 0.08]} material={marquee}>
            <planeGeometry args={[0.92, 0.16]} />
          </mesh>
        </group>
      )}
      {!board && (
        <>
          <mesh position={[0, PLAY_Y + 0.5, zEnd - 0.08]} material={marquee}>
            <planeGeometry args={[1.0, 0.22]} />
          </mesh>
          {lane.holes.map((_, i) => (
            <SkeeCup key={i} lane={lane} index={i} />
          ))}
        </>
      )}

      <mesh position={[0, PLAY_Y + 0.01, THROW_Z + 0.1]} material={dark}>
        <boxGeometry args={[0.62, 0.012, 0.05]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) lamps.current[i] = el;
          }}
          position={[-0.245 + i * 0.07, PLAY_Y + 0.02, THROW_Z + 0.1]}
          material={lampMats[i]}
        >
          <boxGeometry args={[0.055, 0.014, 0.028]} />
        </mesh>
      ))}

      <TableTickets game={game} />

      {[
        [-CAB_W / 2 + 0.12, THROW_Z + 0.08],
        [CAB_W / 2 - 0.12, THROW_Z + 0.08],
        [-CAB_W / 2 + 0.12, origin.z + 0.12],
        [CAB_W / 2 - 0.12, origin.z + 0.12],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} material={body}>
          <boxGeometry args={[0.1, 0.36, 0.1]} />
        </mesh>
      ))}

      {lane.hills.map((h, i) => {
        const w = hillWorld(lane, h);
        return (
          <mesh key={`h${i}`} position={[w.x, w.y + w.height * 0.35, w.z]} scale={[1, 0.48, 1]} material={felt}>
            <sphereGeometry args={[w.r, 9, 6]} />
          </mesh>
        );
      })}
      {lane.bumpers.map((b, i) => {
        const w = bumperWorld(lane, b);
        const col = i % 2 ? "#c47a3a" : "#c45c48";
        return (
          <PopIn key={`b${i}`} delay={i * 0.06}>
            <RigidBody type="fixed" colliders={false} position={[w.x, w.y, w.z]} collisionGroups={STATIC}>
              <CylinderCollider args={[0.1, w.r]} />
              <mesh material={retro(col, { emissive: col, emissiveIntensity: 0.5 })}>
                <cylinderGeometry args={[w.r, w.r, 0.2, 8]} />
              </mesh>
            </RigidBody>
          </PopIn>
        );
      })}
      {lane.pegs.map((p, i) => {
        const w = bumperWorld(lane, { ...p, r: p.r });
        return (
          <mesh key={`p${i}`} position={[w.x, PLAY_Y + 0.08, w.z]} material={cream}>
            <cylinderGeometry args={[0.03, 0.03, 0.16, 6]} />
          </mesh>
        );
      })}
      {lane.crates.map((c, i) => {
        const w = crateWorld(lane, c);
        return <DropCrate key={`c${i}`} x={w.x} y={w.y} z={w.z} w={w.w} hh={w.hh} d={w.d} />;
      })}
      {lane.spinners.map((_, i) => (
        <Spinner key={`s${i}`} lane={lane} index={i} />
      ))}
    </group>
  );
}
