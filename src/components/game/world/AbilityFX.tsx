import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { ballWorld, holeWorld, THROW_Z, FLAT, PLAY_Y, HALF_W } from "@/game/layout3d";

const UP = new THREE.Vector3(0, 1, 0);
const DIR = new THREE.Vector3();
const MID = new THREE.Vector3();
const FROM = new THREE.Vector3();
const TO = new THREE.Vector3();

function setBeam(mesh: THREE.Object3D, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  FROM.set(ax, ay, az);
  TO.set(bx, by, bz);
  MID.copy(FROM).lerp(TO, 0.5);
  DIR.copy(TO).sub(FROM);
  const len = DIR.length();
  mesh.position.copy(MID);
  mesh.scale.set(1, Math.max(0.001, len), 1);
  if (len > 0.001) mesh.quaternion.setFromUnitVectors(UP, DIR.multiplyScalar(1 / len));
}

export function AbilityFX({ game }: { game: WildAlleyGame }) {
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const wellA = useRef<THREE.Mesh>(null);
  const wellB = useRef<THREE.Mesh>(null);
  const trails = useRef<THREE.Mesh[]>([]);
  const gusts = useRef<THREE.Mesh[]>([]);
  const sparks = useRef<THREE.Mesh[]>([]);
  const trailPos = useRef<{ x: number; y: number; z: number }[]>([]);
  const copper = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      color: "#c47a3a",
      emissive: "#c47a3a",
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      flatShading: true,
    });
    return m;
  }, []);
  const cyan = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#88d0ff",
        emissive: "#88d0ff",
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        flatShading: true,
      }),
    [],
  );
  const cream = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#efe6d4",
        emissive: "#efe6d4",
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        flatShading: true,
      }),
    [],
  );
  const gold = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#d4b060",
        emissive: "#d4b060",
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        flatShading: true,
      }),
    [],
  );
  const dark = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#1a1018",
        emissive: "#4a2030",
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        flatShading: true,
      }),
    [],
  );

  const trailMeshes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={`t${i}`}
          ref={(n) => {
            if (n) trails.current[i] = n;
          }}
          material={cream}
          visible={false}
        >
          <sphereGeometry args={[0.028, 6, 5]} />
        </mesh>
      )),
    [cream],
  );
  const gustMeshes = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`g${i}`}
          ref={(n) => {
            if (n) gusts.current[i] = n;
          }}
          material={cream}
          visible={false}
        >
          <boxGeometry args={[0.018, 0.01, 0.16]} />
        </mesh>
      )),
    [cream],
  );
  const sparkMeshes = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`s${i}`}
          ref={(n) => {
            if (n) sparks.current[i] = n;
          }}
          material={gold}
          visible={false}
        >
          <sphereGeometry args={[0.012, 5, 4]} />
        </mesh>
      )),
    [gold],
  );

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const s = game.session;
    const ball = s.balls.find((b) => b.alive) ?? s.balls[0];
    const bw = ball ? ballWorld(s.lane, ball) : null;

    if (bw && (s.phase === "roll" || s.phase === "aim")) {
      trailPos.current.unshift({ x: bw.x, y: bw.y, z: bw.z });
      if (trailPos.current.length > 10) trailPos.current.length = 10;
    } else if (s.phase !== "roll") {
      trailPos.current.length = 0;
    }

    const showTrail = s.phase === "roll" && (s.wants("grease") || s.wants("superball") || s.wants("split") || s.wants("lucky"));
    for (let i = 0; i < trails.current.length; i++) {
      const m = trails.current[i];
      const p = trailPos.current[i];
      if (!m) continue;
      if (!showTrail || !p) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(p.x, p.y, p.z);
      const k = 1 - i / 10;
      m.scale.setScalar(k * (s.wants("superball") ? 1.2 : 0.85));
    }

    const r = ring.current;
    if (r) {
      const pop = s.fxT > 0.02 && (s.fxName === "split" || s.fxName === "throw" || s.fxName === "heavy");
      r.visible = pop;
      if (pop) {
        const origin = ballWorld(s.lane, { x: s.fxX, y: s.fxY, z: 0 });
        r.position.set(origin.x, origin.y + 0.02, origin.z);
        const u = 1 - s.fxT;
        r.scale.setScalar(0.2 + u * 2.4);
        const mat = r.material as THREE.MeshLambertMaterial;
        mat.opacity = s.fxT * (s.fxName === "split" ? 0.95 : 0.55);
      }
    }

    const bm = beam.current;
    if (bm) {
      const on = s.wants("magnet") && bw && ball && ball.alive && (s.phase === "roll" || s.phase === "aim");
      bm.visible = !!on;
      if (on && ball && bw) {
        const h = s.nearestHole(ball.x, ball.y);
        if (h) {
          const hw = holeWorld(s.lane, h);
          setBeam(bm, bw.x, bw.y, bw.z, hw.x, hw.y, hw.z);
          const mat = bm.material as THREE.MeshLambertMaterial;
          mat.opacity = 0.35 + Math.sin(s.time * 9) * 0.2;
        } else bm.visible = false;
      }
    }

    const wind = s.wants("tailwind") || s.wants("crossbreeze");
    for (let i = 0; i < gusts.current.length; i++) {
      const m = gusts.current[i];
      if (!m) continue;
      if (!wind || (s.phase !== "roll" && s.phase !== "aim")) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const t = s.time * (s.wants("tailwind") ? 1.6 : 2.2) + i * 0.7;
      const along = ((t * 0.55) % 1) * FLAT;
      const x = s.wants("crossbreeze") ? Math.sin(t * 2.1) * HALF_W * 0.85 : ((i % 3) - 1) * 0.12;
      m.position.set(x, PLAY_Y + 0.05 + Math.sin(t) * 0.02, THROW_Z - along);
      m.rotation.y = s.wants("crossbreeze") ? Math.PI / 2 : 0;
      m.scale.set(1, 1, s.wants("tailwind") ? 1.4 : 0.8);
    }

    const wellOn = s.wants("gravityWell") && s.phase === "roll";
    for (const [mesh, side] of [
      [wellA.current, -1],
      [wellB.current, 1],
    ] as const) {
      if (!mesh) continue;
      mesh.visible = wellOn;
      if (!wellOn) continue;
      const z = THROW_Z - FLAT * 0.45;
      mesh.position.set(side * (HALF_W + 0.04), PLAY_Y + 0.02, z);
      mesh.rotation.z = s.time * 1.8 * side;
      mesh.scale.setScalar(0.85 + Math.sin(s.time * 4) * 0.12);
    }

    const lucky = s.wants("lucky") && bw;
    for (let i = 0; i < sparks.current.length; i++) {
      const m = sparks.current[i];
      if (!m) continue;
      if (!lucky || !bw) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const a = s.time * 3 + i * 0.8;
      m.position.set(bw.x + Math.cos(a) * 0.07, bw.y + 0.04 + Math.sin(a * 1.3) * 0.04, bw.z + Math.sin(a) * 0.07);
    }

    void dt;
  });

  return (
    <group>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} material={copper} visible={false}>
        <ringGeometry args={[0.08, 0.12, 16]} />
      </mesh>
      <mesh ref={beam} material={cyan} visible={false}>
        <cylinderGeometry args={[0.006, 0.006, 1, 6]} />
      </mesh>
      <mesh ref={wellA} material={dark} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.018, 6, 12]} />
      </mesh>
      <mesh ref={wellB} material={dark} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.018, 6, 12]} />
      </mesh>
      {trailMeshes}
      {gustMeshes}
      {sparkMeshes}
    </group>
  );
}
