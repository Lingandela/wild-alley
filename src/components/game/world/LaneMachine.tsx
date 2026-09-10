import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody, interactionGroups } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { holeRing, paintSign, paintSkeeFace, retro, retroMapped, retroSign, type ArcadeTextures } from "@/game/retroMat";
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
  PLAY_Y,
  RAMP_RISE,
  RAMP_RUN,
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
  xWorld,
} from "@/game/layout3d";
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

function Cup({ lane, index }: { lane: LaneDef; index: number }) {
  const h = lane.holes[index]!;
  const w = holeWorld(lane, h);
  const col = holeRing(h.value);
  const label = useMemo(
    () => retroSign("#efe6d4", { map: paintSign(h.label ?? String(h.value), 256, 96), emissive: col, emissiveIntensity: 0.85 }),
    [h.label, h.value, col],
  );
  const dark = retro("#050203");
  const rim = retro(col, { emissive: col, emissiveIntensity: 0.85 });
  if (w.onBoard) {
    return (
      <group position={[w.lx, w.ly, 0.045]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.07]} material={dark}>
          <cylinderGeometry args={[w.r * 0.92, w.r * 0.7, 0.2, 12]} />
        </mesh>
        <mesh material={dark}>
          <circleGeometry args={[w.r * 0.86, 12]} />
        </mesh>
        <mesh position={[0, 0, 0.008]} material={rim}>
          <ringGeometry args={[w.r * 0.78, w.r * 1.12, 14]} />
        </mesh>
        <mesh position={[0, -w.r - 0.055, 0.02]} material={label}>
          <planeGeometry args={[Math.max(0.16, w.r * 1.15), 0.07]} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[w.x, w.y, w.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} material={dark}>
        <cylinderGeometry args={[w.r * 0.95, w.r * 0.7, 0.18, 14]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={rim}>
        <ringGeometry args={[w.r * 0.7, w.r * 1.05, 16]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={label}>
        <circleGeometry args={[w.r * 0.4, 10]} />
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
        emissive: "#4a1010",
        emissiveMap: faceMap,
        emissiveIntensity: 0.28,
        flatShading: true,
      }),
    [faceMap],
  );
  const board = usesBackboard(lane.theme);
  const half = HALF_W;
  const zLip = rampStartZ();
  const zEnd = rampEndZ();
  const slope = Math.hypot(RAMP_RUN, RAMP_RISE);
  const tilt = Math.atan(RAMP_RISE / RAMP_RUN);
  const origin = boardOrigin();
  const cabLen = FLAT + RAMP_RUN + CAB_FRONT + 0.7;
  const cabZ = THROW_Z + CAB_FRONT / 2 - cabLen / 2;
  const marquee = useMemo(
    () => retroSign("#efe6d4", { map: paintSign(lane.name.toUpperCase(), 512, 96), emissive: "#c47a3a", emissiveIntensity: 0.7 }),
    [lane.name],
  );
  const lastBump = useRef(0);
  const bumpHit = () => {
    const t = game.session.time;
    if (t - lastBump.current < 0.1) return;
    lastBump.current = t;
    game.session.bumperChips += 8;
    game.audio.bumper();
    game.juice.addTrauma(0.1);
  };
  const powerRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = game.session.charging ? game.session.power : 0;
    if (powerRef.current) powerRef.current.scale.x = 0.08 + p * 0.92;
  });

  const laneSurf = lane.theme === "golf" ? retro("#3d6a42", { emissive: "#2a4a30", emissiveIntensity: 0.18 }) : maple;

  return (
    <group>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} {...WOOD}>
        <CuboidCollider args={[CAB_W / 2, 0.42, cabLen / 2]} position={[0, 0.42, cabZ]} />
        <CuboidCollider args={[half + 0.06, 0.08, FLAT / 2]} position={[0, PLAY_Y - 0.06, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[0.04, 0.08, FLAT / 2]} position={[-half - 0.04, PLAY_Y + 0.04, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[0.04, 0.08, FLAT / 2]} position={[half + 0.04, PLAY_Y + 0.04, THROW_Z - FLAT / 2]} />
        <CuboidCollider args={[CAB_W / 2, 0.7, 0.12]} position={[0, 1.1, zEnd - 0.22]} />
      </RigidBody>

      {/* Low cabinet under the alley — not tall side planks */}
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

      {/* Maple alley — one slab */}
      <mesh position={[0, PLAY_Y - 0.03, THROW_Z - FLAT / 2]} material={laneSurf}>
        <boxGeometry args={[half * 2, 0.06, FLAT]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAY_Y + 0.002, THROW_Z - FLAT / 2]} material={laneSurf}>
        <planeGeometry args={[half * 2 - 0.02, FLAT - 0.02]} />
      </mesh>
      {/* Foul line */}
      <mesh position={[0, PLAY_Y + 0.006, THROW_Z - 0.08]} material={cream}>
        <boxGeometry args={[half * 2 - 0.04, 0.004, 0.018]} />
      </mesh>
      {/* Low rails */}
      <mesh position={[-half - 0.025, PLAY_Y + 0.028, THROW_Z - FLAT / 2]} material={railL}>
        <boxGeometry args={[0.05, 0.055, FLAT]} />
      </mesh>
      <mesh position={[half + 0.025, PLAY_Y + 0.028, THROW_Z - FLAT / 2]} material={railR}>
        <boxGeometry args={[0.05, 0.055, FLAT]} />
      </mesh>

      {/* Ramp */}
      <mesh position={[0, PLAY_Y + RAMP_RISE / 2, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={laneSurf}>
        <boxGeometry args={[half * 2 + 0.02, 0.055, slope]} />
      </mesh>
      <mesh position={[-half - 0.025, PLAY_Y + RAMP_RISE / 2 + 0.03, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={railL}>
        <boxGeometry args={[0.05, 0.055, slope]} />
      </mesh>
      <mesh position={[half + 0.025, PLAY_Y + RAMP_RISE / 2 + 0.03, zLip - RAMP_RUN / 2]} rotation={[tilt, 0, 0]} material={railR}>
        <boxGeometry args={[0.05, 0.055, slope]} />
      </mesh>
      {/* Ramp lip */}
      <mesh position={[0, PLAY_Y + RAMP_RISE + 0.01, zEnd + 0.02]} material={gold}>
        <boxGeometry args={[half * 2 + 0.08, 0.03, 0.04]} />
      </mesh>

      {/* Ball return trough, right side */}
      <mesh position={[half + 0.16, PLAY_Y - 0.08, THROW_Z - FLAT * 0.35]} material={dark}>
        <boxGeometry args={[0.16, 0.1, FLAT * 0.55]} />
      </mesh>
      {[0.15, 0.32, 0.49, 0.66].map((t, i) => (
        <mesh key={i} position={[half + 0.16, PLAY_Y - 0.04, THROW_Z - 0.35 - t]} material={retro("#ead7b0")}>
          <sphereGeometry args={[BALL_R3, 8, 6]} />
        </mesh>
      ))}

      {/* Front cage bars */}
      {[-0.28, -0.14, 0, 0.14, 0.28].map((x) => (
        <mesh key={x} position={[x, PLAY_Y + 0.22, THROW_Z + 0.16]} material={retro("#3a2a28")}>
          <boxGeometry args={[0.018, 0.42, 0.018]} />
        </mesh>
      ))}
      <mesh position={[0, PLAY_Y + 0.44, THROW_Z + 0.16]} material={retro("#3a2a28")}>
        <boxGeometry args={[0.62, 0.02, 0.02]} />
      </mesh>

      {board && (
        <group position={[origin.x, origin.y, origin.z]} rotation={[-BOARD_LEAN, 0, 0]}>
          {/* Scoring cabinet behind the disc */}
          <mesh position={[0, 0.62, -0.22]} material={body}>
            <boxGeometry args={[1.18, 1.42, 0.42]} />
          </mesh>
          <mesh position={[0, 1.38, -0.08]} material={stripe}>
            <boxGeometry args={[1.22, 0.1, 0.36]} />
          </mesh>
          {/* Circular target */}
          <mesh position={[0, FACE_CY, -0.07]} rotation={[Math.PI / 2, 0, 0]} material={body}>
            <cylinderGeometry args={[FACE_R + 0.04, FACE_R + 0.04, 0.14, 20]} />
          </mesh>
          <mesh position={[0, FACE_CY, 0.01]} material={faceMat}>
            <circleGeometry args={[FACE_R, 20]} />
          </mesh>
          <mesh position={[0, FACE_CY, 0.02]} material={cream}>
            <ringGeometry args={[FACE_R * 0.96, FACE_R + 0.012, 20]} />
          </mesh>
          {lane.holes.map((_, i) => (
            <Cup key={i} lane={lane} index={i} />
          ))}
          <mesh position={[0, 1.42, 0.08]} material={marquee}>
            <planeGeometry args={[1.05, 0.2]} />
          </mesh>
        </group>
      )}
      {!board && (
        <>
          <mesh position={[0, PLAY_Y + 0.5, zEnd - 0.08]} material={marquee}>
            <planeGeometry args={[1.0, 0.22]} />
          </mesh>
          {lane.holes.map((_, i) => (
            <Cup key={i} lane={lane} index={i} />
          ))}
        </>
      )}

      {/* Power meter on the throw deck */}
      <mesh position={[0, PLAY_Y + 0.012, THROW_Z + 0.08]} material={dark}>
        <boxGeometry args={[0.72, 0.01, 0.04]} />
      </mesh>
      <mesh ref={powerRef} position={[0, PLAY_Y + 0.018, THROW_Z + 0.08]} material={retro("#c45c48", { emissive: "#c45c48", emissiveIntensity: 0.7 })}>
        <boxGeometry args={[0.7, 0.012, 0.028]} />
      </mesh>

      {/* Legs */}
      {[
        [-CAB_W / 2 + 0.12, THROW_Z + 0.08],
        [CAB_W / 2 - 0.12, THROW_Z + 0.08],
        [-CAB_W / 2 + 0.12, zEnd + 0.25],
        [CAB_W / 2 - 0.12, zEnd + 0.25],
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
            <RigidBody type="fixed" colliders={false} position={[w.x, w.y, w.z]} collisionGroups={STATIC} onCollisionEnter={bumpHit}>
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
        return (
          <DropCrate key={`c${i}`} x={w.x} y={w.y} z={w.z} w={w.w} hh={w.hh} d={w.d} />
        );
      })}
      {lane.spinners.map((_, i) => (
        <Spinner key={`s${i}`} lane={lane} index={i} />
      ))}
    </group>
  );
}
