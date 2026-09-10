import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import { COL, PARLOR } from "@/game/layout3d";
import { paintSign, retro, retroMapped, retroSign, type ArcadeTextures } from "@/game/retroMat";

const STATIC = interactionGroups([COL.static], [COL.player, COL.static]);
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28 });

function Blob({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, z]} material={BLOB_MAT}>
      <circleGeometry args={[0.38 * s, 8]} />
    </mesh>
  );
}

function Pendant({ position, color = "#f0d8a8" }: { position: [number, number, number]; color?: string }) {
  const glow = retro(color, { emissive: color, emissiveIntensity: 0.95 });
  const cord = retro("#2a2220");
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} material={cord}>
        <cylinderGeometry args={[0.012, 0.012, 0.62, 5]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} material={glow}>
        <sphereGeometry args={[0.1, 6, 5]} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} material={retro("#3a2a22")}>
        <coneGeometry args={[0.13, 0.11, 6]} />
      </mesh>
    </group>
  );
}

function Frame({
  position,
  yaw = 0,
  w,
  h,
  art,
}: {
  position: [number, number, number];
  yaw?: number;
  w: number;
  h: number;
  art: THREE.Material;
}) {
  const wood = retro("#3a281c");
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0, -0.03]} material={wood}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.06]} />
      </mesh>
      <mesh position={[0, 0, 0.004]} material={art}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

function ArcadeCab({
  position,
  yaw = 0,
  art,
}: {
  position: [number, number, number];
  yaw?: number;
  art: THREE.Texture;
}) {
  const body = retro("#1c161c");
  const trim = retro("#c45c48");
  const deck = retro("#2a2228");
  const screen = retroMapped(art, "#d8c8b8", { emissive: "#4a6880", emissiveIntensity: 0.45 });
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} friction={0.7}>
        <CuboidCollider args={[0.4, 0.82, 0.36]} position={[0, 0.82, 0]} />
      </RigidBody>
      <mesh position={[0, 0.82, 0]} material={body}>
        <boxGeometry args={[0.78, 1.64, 0.7]} />
      </mesh>
      <mesh position={[0, 1.68, 0]} material={trim}>
        <boxGeometry args={[0.86, 0.12, 0.76]} />
      </mesh>
      <mesh position={[0, 1.28, 0.36]} rotation={[-0.32, 0, 0]} material={screen}>
        <planeGeometry args={[0.58, 0.44]} />
      </mesh>
      <mesh position={[0, 0.72, 0.28]} material={deck}>
        <boxGeometry args={[0.7, 0.1, 0.32]} />
      </mesh>
      <mesh position={[0, 0.78, 0.4]} material={retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.35 })}>
        <boxGeometry args={[0.18, 0.04, 0.08]} />
      </mesh>
      <Blob x={0} z={0} s={1.15} />
    </group>
  );
}

function Case({
  position,
  yaw = 0,
  w,
  h,
  d,
  art,
  cap,
}: {
  position: [number, number, number];
  yaw?: number;
  w: number;
  h: number;
  d: number;
  art: THREE.Material;
  cap: THREE.Material;
}) {
  const wood = retro("#3a2818");
  const glass = retro("#9ab0c0", { transparent: true, opacity: 0.22 });
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} friction={0.7}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h / 2, 0]} material={wood}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]} material={cap}>
        <boxGeometry args={[w + 0.08, 0.08, d + 0.06]} />
      </mesh>
      <mesh position={[0, h * 0.58, d / 2 + 0.01]} material={art}>
        <planeGeometry args={[w * 0.86, h * 0.72]} />
      </mesh>
      <mesh position={[0, h * 0.58, d / 2 + 0.03]} material={glass}>
        <boxGeometry args={[w * 0.88, h * 0.74, 0.02]} />
      </mesh>
      <Blob x={0} z={0} s={w * 0.85} />
    </group>
  );
}

function NeonBanner({ title, position, w = 3.2, h = 0.62 }: { title: string; position: [number, number, number]; w?: number; h?: number }) {
  const mat = useMemo(() => retroSign("#efe6d4", { map: paintSign(title), emissive: "#c47a3a", emissiveIntensity: 0.85 }), [title]);
  const t = useRef(0);
  useFrame((_, d) => {
    t.current += d;
    mat.emissiveIntensity = 0.72 + Math.sin(t.current * 6.4) * 0.14;
  });
  return (
    <mesh position={position} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

export function Room({ tex }: { tex: ArcadeTextures }) {
  const floor = useMemo(() => retroMapped(tex.floor, "#d8c8c0", { snap: false }), [tex.floor]);
  const wall = useMemo(() => retroMapped(tex.wall, "#c4a090", { snap: false }), [tex.wall]);
  const wood = useMemo(() => retroMapped(tex.wood, "#e8d0b8", { snap: false }), [tex.wood]);
  const poster = useMemo(() => retroMapped(tex.poster, "#ffffff"), [tex.poster]);
  const windowMat = useMemo(
    () => retroMapped(tex.window, "#d0c8e0", { emissive: "#6a5080", emissiveIntensity: 0.4 }),
    [tex.window],
  );
  const prizes = useMemo(() => retroMapped(tex.prizes, "#ffffff"), [tex.prizes]);
  const prizes2 = useMemo(() => retroMapped(tex.prizes2, "#ffffff"), [tex.prizes2]);
  const prizes3 = useMemo(() => retroMapped(tex.prizes3, "#ffffff"), [tex.prizes3]);
  const candy = useMemo(() => retroMapped(tex.candy, "#ffffff"), [tex.candy]);
  const food = useMemo(() => retroMapped(tex.food, "#ffffff"), [tex.food]);
  const mural = useMemo(() => retroMapped(tex.mural, "#ffffff"), [tex.mural]);
  const banner = useMemo(() => retroMapped(tex.banner, "#ffffff"), [tex.banner]);
  const tickets = useMemo(() => retroMapped(tex.tickets, "#ffffff"), [tex.tickets]);
  const claw = useMemo(() => retroMapped(tex.claw, "#ffffff"), [tex.claw]);
  const hanging = useMemo(() => retroMapped(tex.hanging, "#ffffff"), [tex.hanging]);
  const trim = retro("#3a281c");
  const cherry = retro("#c45c48");
  const dark = retro("#1a1214");
  const glass = retro("#9ab0c0", { transparent: true, opacity: 0.22 });

  const W = PARLOR.wall;
  const zB = PARLOR.zBack;
  const zF = PARLOR.zFront;
  const H = PARLOR.ceil;
  const spanZ = zF - zB;
  const midZ = (zF + zB) / 2;

  return (
    <group>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} friction={0.7}>
        <CuboidCollider args={[W + 0.6, 0.12, spanZ / 2 + 0.4]} position={[0, -0.12, midZ]} />
        <CuboidCollider args={[W + 0.6, 0.12, spanZ / 2 + 0.4]} position={[0, H + 0.12, midZ]} />
        <CuboidCollider args={[W + 0.8, H / 2, 0.18]} position={[0, H / 2, zB - 0.12]} />
        <CuboidCollider args={[W + 0.8, H / 2, 0.18]} position={[0, H / 2, zF + 0.12]} />
        <CuboidCollider args={[0.18, H / 2, spanZ / 2 + 0.4]} position={[W + 0.12, H / 2, midZ]} />
        <CuboidCollider args={[0.18, H / 2, spanZ / 2 + 0.4]} position={[-W - 0.12, H / 2, midZ]} />
        <CuboidCollider args={[1.3, 0.7, 0.4]} position={[0, 0.7, zB + 0.7]} />
        <CuboidCollider args={[0.36, 0.55, 0.28]} position={[4.2, 0.55, -1.6]} />
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]} material={floor} receiveShadow={false}>
        <planeGeometry args={[(W + 0.6) * 2, spanZ + 1]} />
      </mesh>

      <mesh position={[0, H / 2, zB - 0.14]} material={wall}>
        <boxGeometry args={[(W + 0.5) * 2, H, 0.28]} />
      </mesh>
      <mesh position={[W, H / 2, midZ]} material={wall}>
        <boxGeometry args={[0.28, H, spanZ + 0.8]} />
      </mesh>
      <mesh position={[-W, H / 2, midZ]} material={wall}>
        <boxGeometry args={[0.28, H, spanZ + 0.8]} />
      </mesh>
      <mesh position={[0, H / 2, zF + 0.14]} material={wall}>
        <boxGeometry args={[(W + 0.5) * 2, H, 0.28]} />
      </mesh>
      <mesh position={[0, H + 0.02, midZ]} material={trim}>
        <boxGeometry args={[(W + 0.6) * 2, 0.12, spanZ + 1]} />
      </mesh>
      {[-8.4, -5.2, -2.0, 1.2, 4.4].map((z) => (
        <mesh key={z} position={[0, H - 0.08, z]} material={retro("#4a3428")}>
          <boxGeometry args={[W * 2 - 0.4, 0.1, 0.18]} />
        </mesh>
      ))}

      {/* Window, framed, no spinning prop behind it. */}
      <mesh position={[-W + 0.15, 1.95, -3.4]} material={windowMat}>
        <planeGeometry args={[2.6, 1.7]} />
      </mesh>
      <mesh position={[-W + 0.14, 1.95, -3.4]} material={trim}>
        <boxGeometry args={[0.08, 1.86, 2.78]} />
      </mesh>
      <mesh position={[-W + 0.14, 1.95, -3.4]} material={trim}>
        <boxGeometry args={[0.08, 1.86, 0.08]} />
      </mesh>

      <Frame position={[-W + 0.16, 2.15, 0.55]} w={0.9} h={1.25} art={poster} />
      <Frame position={[-W + 0.16, 2.05, 2.55]} w={0.85} h={1.2} art={hanging} />
      <Frame position={[W - 0.16, 2.2, -4.2]} yaw={Math.PI} w={1.4} h={1.75} art={mural} />
      <Frame position={[W - 0.16, 1.65, 1.6]} yaw={Math.PI} w={2.3} h={1.15} art={banner} />
      <Frame position={[W - 0.16, 2.15, -1.2]} yaw={Math.PI} w={0.75} h={1.1} art={poster} />

      <NeonBanner title="WILD ALLEY" position={[0, H - 0.85, zB + 0.16]} />
      <NeonBanner title="TICKETS" position={[3.1, H - 1.55, zB + 0.16]} w={1.5} h={0.38} />

      <group position={[0, 0, zB + 0.7]}>
        <mesh position={[0, 0.7, 0]} material={dark}>
          <boxGeometry args={[2.5, 1.4, 0.75]} />
        </mesh>
        <mesh position={[0, 1.44, 0.08]} material={cherry}>
          <boxGeometry args={[2.65, 0.12, 0.9]} />
        </mesh>
        <mesh position={[0, 0.85, 0.38]} material={tickets}>
          <planeGeometry args={[1.55, 0.72]} />
        </mesh>
        <mesh position={[0, 0.85, 0.4]} material={glass}>
          <boxGeometry args={[1.58, 0.74, 0.02]} />
        </mesh>
        <mesh position={[0, 0.42, 0.44]} material={wood}>
          <boxGeometry args={[2.15, 0.08, 0.45]} />
        </mesh>
        <Blob x={0} z={0} s={2.2} />
      </group>

      <Case position={[3.6, 0, -7.2]} w={2.15} h={1.15} d={0.85} art={prizes} cap={trim} />
      <Case position={[-4.2, 0, 3.4]} w={1.2} h={1.4} d={0.7} art={prizes2} cap={cherry} />
      <Case position={[-4.3, 0, 4.7]} w={1.25} h={1.4} d={0.68} art={prizes3} cap={cherry} />
      <Case position={[4.15, 0, 2.1]} w={1.4} h={1.15} d={0.72} art={food} cap={trim} />
      <Case position={[-4.5, 0, -5.4]} w={0.95} h={1.7} d={0.7} art={claw} cap={cherry} />

      <group position={[4.15, 0, 2.1]}>
        <mesh position={[-0.78, 0.85, 0]} rotation={[0, Math.PI / 2, 0]} material={candy}>
          <planeGeometry args={[0.55, 0.7]} />
        </mesh>
      </group>

      <group position={[4.2, 0, -1.6]}>
        <mesh position={[0, 0.55, 0]} material={cherry}>
          <boxGeometry args={[0.7, 1.1, 0.55]} />
        </mesh>
        <mesh position={[0, 1.22, 0]} material={retro("#efe6d4")}>
          <cylinderGeometry args={[0.28, 0.28, 0.42, 8]} />
        </mesh>
        <mesh position={[0, 1.48, 0]} material={retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.3 })}>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 8]} />
        </mesh>
        <Blob x={0} z={0} s={0.9} />
      </group>

      <ArcadeCab position={[-4.55, 0, 0.35]} yaw={0.55} art={tex.cabinet} />
      <ArcadeCab position={[-4.7, 0, -1.45]} yaw={0.72} art={tex.cabinet} />
      <ArcadeCab position={[-4.4, 0, -3.15]} yaw={0.9} art={tex.cabinet} />

      <group position={[1.4, 0, 2.2]}>
        <mesh position={[0, 0.28, 0]} material={retro("#4a3428")}>
          <cylinderGeometry args={[0.04, 0.05, 0.55, 6]} />
        </mesh>
        <mesh position={[0, 0.58, 0]} material={cherry}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 8]} />
        </mesh>
        <Blob x={0} z={0} s={0.55} />
      </group>

      <group position={[-1.15, 0, 1.8]}>
        <mesh position={[0, 0.22, 0]} material={wood}>
          <boxGeometry args={[0.42, 0.12, 0.28]} />
        </mesh>
        {[-0.12, 0, 0.12].map((x, i) => (
          <mesh key={x} position={[x, 0.32, i % 2 ? 0.05 : -0.04]} material={retro("#ead7b0")}>
            <sphereGeometry args={[0.055, 7, 5]} />
          </mesh>
        ))}
      </group>

      <group position={[-5.1, 0, 2.0]}>
        <mesh position={[0, 0.18, 0]} material={retro("#4a3020")}>
          <cylinderGeometry args={[0.08, 0.1, 0.36, 6]} />
        </mesh>
        <mesh position={[0, 0.55, 0]} material={retro("#3a5840")}>
          <sphereGeometry args={[0.22, 6, 5]} />
        </mesh>
        <mesh position={[0.12, 0.62, 0.08]} material={retro("#4a6850")}>
          <sphereGeometry args={[0.14, 6, 5]} />
        </mesh>
      </group>

      <mesh position={[5.1, 0.22, 3.4]} material={retro("#5a3a28")}>
        <boxGeometry args={[0.55, 0.44, 0.4]} />
      </mesh>

      <Pendant position={[0, H - 0.55, 0.4]} />
      <Pendant position={[-1.1, H - 0.55, -1.8]} color="#f0c090" />
      <Pendant position={[1.1, H - 0.55, -1.8]} color="#f0c090" />
      <Pendant position={[0, H - 0.55, -4.2]} />
      <Pendant position={[-1.4, H - 0.55, -6.6]} color="#e8b070" />
      <Pendant position={[1.4, H - 0.55, -6.6]} color="#e8b070" />
      <Pendant position={[-2.4, H - 0.55, 2.4]} color="#f0d8a8" />
      <Pendant position={[2.6, H - 0.55, 2.6]} color="#f0d8a8" />
    </group>
  );
}
