import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, interactionGroups } from "@react-three/rapier";
import * as THREE from "three";
import { COL } from "@/game/layout3d";
import { paintSign, retro, retroMapped, retroSign, type ArcadeTextures } from "@/game/retroMat";

const STATIC = interactionGroups([COL.static], [COL.player, COL.static]);
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.32 });

function Blob({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, z]} material={BLOB_MAT}>
      <circleGeometry args={[0.38 * s, 8]} />
    </mesh>
  );
}

function Pendant({ position, color = "#f0d8a8" }: { position: [number, number, number]; color?: string }) {
  const glow = retro(color, { emissive: color, emissiveIntensity: 0.9 });
  const cord = retro("#2a2220");
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} material={cord}>
        <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} material={glow}>
        <sphereGeometry args={[0.09, 6, 5]} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]} material={retro("#3a2a22")}>
        <coneGeometry args={[0.12, 0.1, 6]} />
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

function Ferris({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const steel = retro("#3a2a32");
  const light = retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.7 });
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.x += d * 0.18;
  });
  const cars = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <group position={position}>
      <mesh position={[0, -0.9, 0]} material={steel}>
        <boxGeometry args={[0.12, 1.8, 0.12]} />
      </mesh>
      <group ref={ref} position={[0, 0.4, 0]}>
        <mesh material={steel} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.05, 0.035, 5, 12]} />
        </mesh>
        {cars.map((i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[0, Math.sin(a) * 1.05, Math.cos(a) * 1.05]}
              material={i % 2 ? light : retro("#efe6d4")}
            >
              <boxGeometry args={[0.16, 0.14, 0.12]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Fan({ position }: { position: [number, number, number] }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (blades.current) blades.current.rotation.y += d * 1.6;
  });
  const metal = retro("#4a4038");
  return (
    <group position={position}>
      <mesh material={metal}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0.12, (i * Math.PI * 2) / 3, 0]} position={[0.28, 0, 0]} material={retro("#d8c8b0")}>
            <boxGeometry args={[0.55, 0.02, 0.12]} />
          </mesh>
        ))}
      </group>
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
    () => retroMapped(tex.window, "#d0c8e0", { emissive: "#6a5080", emissiveIntensity: 0.35 }),
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
  const cream = retro("#efe6d4");
  const cherry = retro("#c45c48");
  const dark = retro("#1a1214");
  const glass = retro("#9ab0c0", { transparent: true, opacity: 0.22 });

  return (
    <group>
      <RigidBody type="fixed" colliders={false} collisionGroups={STATIC} friction={0.7}>
        <CuboidCollider args={[6.2, 0.12, 8.2]} position={[0, -0.12, -1.5]} />
        <CuboidCollider args={[6.2, 0.12, 8.2]} position={[0, 3.58, -1.5]} />
        <CuboidCollider args={[6.4, 1.9, 0.18]} position={[0, 1.8, -8.82]} />
        <CuboidCollider args={[6.4, 1.9, 0.18]} position={[0, 1.8, 5.72]} />
        <CuboidCollider args={[0.2, 1.9, 7.4]} position={[4.68, 1.8, -1.5]} />
        <CuboidCollider args={[0.2, 1.9, 7.4]} position={[-4.68, 1.8, -1.5]} />
        <CuboidCollider args={[1.2, 0.7, 0.4]} position={[0, 0.7, -8.15]} />
        <CuboidCollider args={[1.05, 0.55, 0.42]} position={[3.15, 0.55, -6.4]} />
        <CuboidCollider args={[0.35, 0.55, 0.28]} position={[3.35, 0.55, -1.35]} />
        <CuboidCollider args={[0.4, 0.82, 0.36]} position={[-3.45, 0.82, 0.55]} />
        <CuboidCollider args={[0.4, 0.82, 0.36]} position={[-3.55, 0.82, -1.15]} />
        <CuboidCollider args={[0.4, 0.82, 0.36]} position={[-3.35, 0.82, -2.75]} />
        <CuboidCollider args={[0.55, 0.7, 0.4]} position={[-3.2, 0.7, 3.15]} />
        <CuboidCollider args={[0.6, 0.7, 0.35]} position={[-3.25, 0.7, 4.05]} />
        <CuboidCollider args={[0.7, 0.6, 0.4]} position={[3.2, 0.6, 1.55]} />
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2.4]} material={floor} receiveShadow={false}>
        <planeGeometry args={[12, 16]} />
      </mesh>

      <mesh position={[0, 1.75, -8.85]} material={wall}>
        <boxGeometry args={[12, 3.5, 0.28]} />
      </mesh>
      <mesh position={[4.75, 1.75, -2.4]} material={wall}>
        <boxGeometry args={[0.28, 3.5, 13.2]} />
      </mesh>
      <mesh position={[-4.75, 1.75, 1.7]} material={wall}>
        <boxGeometry args={[0.28, 3.5, 5.2]} />
      </mesh>
      <mesh position={[-4.75, 1.75, -6.4]} material={wall}>
        <boxGeometry args={[0.28, 3.5, 5.1]} />
      </mesh>
      <mesh position={[-4.75, 0.55, -3.15]} material={wall}>
        <boxGeometry args={[0.28, 1.1, 1.8]} />
      </mesh>
      <mesh position={[-4.75, 3.05, -3.15]} material={wall}>
        <boxGeometry args={[0.28, 0.9, 1.8]} />
      </mesh>
      <mesh position={[0, 1.75, 5.8]} material={wall}>
        <boxGeometry args={[12, 3.5, 0.28]} />
      </mesh>
      <mesh position={[0, 3.52, -2.4]} material={trim}>
        <boxGeometry args={[12.2, 0.12, 13.4]} />
      </mesh>
      {[-6.2, -3.4, -0.6, 2.2].map((z) => (
        <mesh key={z} position={[0, 3.42, z]} material={retro("#4a3428")}>
          <boxGeometry args={[11.6, 0.1, 0.18]} />
        </mesh>
      ))}

      <mesh position={[-4.6, 1.85, -3.15]} material={windowMat}>
        <planeGeometry args={[2.4, 1.55]} />
      </mesh>
      <mesh position={[-4.61, 1.85, -3.15]} material={trim}>
        <boxGeometry args={[0.08, 1.7, 2.55]} />
      </mesh>
      <Ferris position={[-6.1, 1.55, -3.2]} />
      <mesh position={[-7.2, 1.9, -3.2]} material={retro("#1a1020", { emissive: "#2a1838", emissiveIntensity: 0.4 })}>
        <planeGeometry args={[4, 3.2]} />
      </mesh>

      <mesh position={[-4.55, 2.15, 0.35]} material={poster}>
        <planeGeometry args={[0.85, 1.2]} />
      </mesh>
      <mesh position={[4.55, 2.15, -3.2]} rotation={[0, Math.PI, 0]} material={mural}>
        <planeGeometry args={[1.35, 1.7]} />
      </mesh>
      <mesh position={[4.55, 1.55, 1.35]} rotation={[0, Math.PI, 0]} material={banner}>
        <planeGeometry args={[2.4, 1.15]} />
      </mesh>
      <mesh position={[4.55, 2.05, -0.4]} rotation={[0, Math.PI, 0]} material={poster}>
        <planeGeometry args={[0.7, 1.05]} />
      </mesh>
      <mesh position={[-4.55, 2.05, 2.15]} material={hanging}>
        <planeGeometry args={[0.85, 1.25]} />
      </mesh>

      <NeonBanner title="WILD ALLEY" position={[0, 3.08, -8.68]} />
      <NeonBanner title="TICKETS" position={[2.55, 2.42, -8.68]} w={1.5} h={0.38} />

      <group position={[0, 0, -8.15]}>
        <mesh position={[0, 0.7, 0]} material={dark}>
          <boxGeometry args={[2.4, 1.4, 0.7]} />
        </mesh>
        <mesh position={[0, 1.42, 0.1]} material={cherry}>
          <boxGeometry args={[2.55, 0.12, 0.9]} />
        </mesh>
        <mesh position={[0, 0.85, 0.36]} material={tickets}>
          <planeGeometry args={[1.5, 0.7]} />
        </mesh>
        <mesh position={[0, 0.85, 0.38]} material={glass}>
          <boxGeometry args={[1.52, 0.72, 0.02]} />
        </mesh>
        <mesh position={[0, 0.42, 0.42]} material={wood}>
          <boxGeometry args={[2.1, 0.08, 0.45]} />
        </mesh>
        <Blob x={0} z={0} s={2.2} />
      </group>

      <group position={[3.15, 0, -6.4]}>
        <mesh position={[0, 0.55, 0]} material={wood}>
          <boxGeometry args={[2.1, 1.1, 0.85]} />
        </mesh>
        <mesh position={[0, 1.45, -0.28]} material={prizes}>
          <planeGeometry args={[1.9, 1.05]} />
        </mesh>
        <mesh position={[0, 1.45, -0.22]} material={glass}>
          <boxGeometry args={[1.95, 1.1, 0.04]} />
        </mesh>
        <mesh position={[0, 2.05, -0.28]} material={trim}>
          <boxGeometry args={[2.05, 0.08, 0.2]} />
        </mesh>
        <Blob x={0} z={0} s={2} />
      </group>

      <group position={[-3.15, 0, 3.15]}>
        <mesh position={[0, 0.7, 0]} material={wood}>
          <boxGeometry args={[1.15, 1.4, 0.7]} />
        </mesh>
        <mesh position={[0, 0.85, 0.36]} material={prizes2}>
          <planeGeometry args={[1.0, 1.05]} />
        </mesh>
        <mesh position={[0, 0.85, 0.38]} material={glass}>
          <boxGeometry args={[1.02, 1.08, 0.02]} />
        </mesh>
        <mesh position={[0, 1.48, 0]} material={cherry}>
          <boxGeometry args={[1.2, 0.08, 0.72]} />
        </mesh>
        <Blob x={0} z={0} s={1.4} />
      </group>

      <group position={[3.2, 0, 1.55]}>
        <mesh position={[0, 0.55, 0]} material={wood}>
          <boxGeometry args={[1.35, 1.1, 0.7]} />
        </mesh>
        <mesh position={[0, 0.72, 0.36]} material={food}>
          <planeGeometry args={[1.15, 0.72]} />
        </mesh>
        <mesh position={[0, 0.72, 0.38]} material={glass}>
          <boxGeometry args={[1.18, 0.75, 0.02]} />
        </mesh>
        <mesh position={[0, 1.18, 0]} material={trim}>
          <boxGeometry args={[1.4, 0.08, 0.72]} />
        </mesh>
        <mesh position={[-0.72, 0.85, 0]} rotation={[0, Math.PI / 2, 0]} material={candy}>
          <planeGeometry args={[0.55, 0.7]} />
        </mesh>
        <Blob x={0} z={0} s={1.3} />
      </group>

      <group position={[-3.5, 0, -4.35]}>
        <mesh position={[0, 0.85, 0]} material={dark}>
          <boxGeometry args={[0.9, 1.7, 0.7]} />
        </mesh>
        <mesh position={[0, 1.05, 0.36]} material={claw}>
          <planeGeometry args={[0.72, 1.15]} />
        </mesh>
        <mesh position={[0, 1.05, 0.38]} material={glass}>
          <boxGeometry args={[0.74, 1.18, 0.02]} />
        </mesh>
        <mesh position={[0, 1.78, 0]} material={cherry}>
          <boxGeometry args={[0.95, 0.1, 0.72]} />
        </mesh>
        <Blob x={0} z={0} s={1.1} />
      </group>

      <group position={[3.35, 0, -1.35]}>
        <mesh position={[0, 0.55, 0]} material={cherry}>
          <boxGeometry args={[0.7, 1.1, 0.55]} />
        </mesh>
        <mesh position={[0, 1.22, 0]} material={cream}>
          <cylinderGeometry args={[0.28, 0.28, 0.42, 8]} />
        </mesh>
        <mesh position={[0, 1.48, 0]} material={retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.3 })}>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 8]} />
        </mesh>
        <Blob x={0} z={0} s={0.9} />
      </group>

      <ArcadeCab position={[-3.45, 0, 0.55]} yaw={0.55} art={tex.cabinet} />
      <ArcadeCab position={[-3.55, 0, -1.15]} yaw={0.72} art={tex.cabinet} />
      <ArcadeCab position={[-3.35, 0, -2.75]} yaw={0.9} art={tex.cabinet} />

      <group position={[-3.25, 0, 4.05]}>
        <mesh position={[0, 0.7, 0]} material={wood}>
          <boxGeometry args={[1.2, 1.4, 0.65]} />
        </mesh>
        <mesh position={[0, 0.85, 0.34]} material={prizes3}>
          <planeGeometry args={[1.05, 1.1]} />
        </mesh>
        <mesh position={[0, 0.85, 0.36]} material={glass}>
          <boxGeometry args={[1.08, 1.12, 0.02]} />
        </mesh>
        <mesh position={[0, 1.48, 0]} material={cherry}>
          <boxGeometry args={[1.25, 0.08, 0.68]} />
        </mesh>
        <Blob x={0} z={0} s={1.4} />
      </group>

      <group position={[1.15, 0, 1.55]}>
        <mesh position={[0, 0.28, 0]} material={retro("#4a3428")}>
          <cylinderGeometry args={[0.04, 0.05, 0.55, 6]} />
        </mesh>
        <mesh position={[0, 0.58, 0]} material={cherry}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 8]} />
        </mesh>
        <Blob x={0} z={0} s={0.55} />
      </group>

      <group position={[-0.95, 0, 1.15]}>
        <mesh position={[0, 0.22, 0]} material={wood}>
          <boxGeometry args={[0.42, 0.12, 0.28]} />
        </mesh>
        {[-0.12, 0, 0.12].map((x, i) => (
          <mesh key={x} position={[x, 0.32, i % 2 ? 0.05 : -0.04]} material={retro("#ead7b0")}>
            <sphereGeometry args={[0.055, 7, 5]} />
          </mesh>
        ))}
      </group>

      <group position={[-3.9, 0, 2.35]}>
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

      <mesh position={[3.9, 0.22, 2.1]} material={retro("#5a3a28")}>
        <boxGeometry args={[0.55, 0.44, 0.4]} />
      </mesh>

      <Pendant position={[0, 3.15, 0.15]} />
      <Pendant position={[-0.55, 3.15, -1.6]} color="#f0c090" />
      <Pendant position={[0.55, 3.15, -1.6]} color="#f0c090" />
      <Pendant position={[0, 3.15, -3.4]} />
      <Pendant position={[-0.7, 3.15, -5.1]} color="#e8b070" />
      <Pendant position={[0.7, 3.15, -5.1]} color="#e8b070" />
      <Fan position={[0, 3.38, -2.2]} />
    </group>
  );
}
