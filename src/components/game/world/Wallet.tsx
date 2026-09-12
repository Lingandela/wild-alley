import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import type { UiCard } from "@/game/types";
import { easeOutBack, spring, stepSpring, tween, stepTween } from "@/game/anim";
import { paintBill, paintIdCard, paintStub, retro, retroMapped } from "@/game/retroMat";
import { isLookingAtLap } from "@/game/foundations";

const LEAF_W = 0.122;
const LEAF_H = 0.102;
const LEAF_T = 0.008;
const CARD_W = 0.078;
const CARD_H = 0.018;
const SLOTS = 5;
/** Local width of both leaves + hands, used to fit the open bifold on screen. */
const SPAN_W = 0.3;
const SPAN_H = 0.13;

const _off = new THREE.Vector3();
const _tilt = new THREE.Quaternion();
const _euler = new THREE.Euler();

function asViewmodel(root: THREE.Object3D) {
  root.traverse((o) => {
    o.frustumCulled = false;
    o.renderOrder = 1200;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
    for (const m of mats) {
      if (!m) continue;
      m.depthTest = false;
      m.depthWrite = false;
    }
  });
}

function SlotCard({
  card,
  selected,
  slot,
  hover,
  torn,
  onHover,
  onTear,
}: {
  card: UiCard;
  selected: boolean;
  slot: number;
  hover: boolean;
  torn: boolean;
  onHover: (id: string | null) => void;
  onTear: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const pull = useRef(spring(0, 26, 0.72));
  const rip = useRef(tween(0, 0, 0.01));
  const ripping = useRef(false);
  const map = useMemo(
    () => paintStub(card.name, card.type, selected),
    [card.name, card.type, selected],
  );
  const face = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map,
        color: "#ffffff",
        depthTest: false,
        depthWrite: false,
      }),
    [map],
  );
  const edge = useMemo(() => retro(card.type === "sabotage" ? "#3a1818" : "#d8c8a0"), [card.type]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    pull.current.target = torn ? 0.5 : hover ? 0.48 : selected ? 0.28 : 0.06;
    stepSpring(pull.current, dt);
    const p = pull.current.value;
    let extra = 0;
    if (ripping.current) {
      extra = stepTween(rip.current, dt);
      if (rip.current.done) {
        ripping.current = false;
        onTear();
      }
    }
    const g = group.current;
    if (!g) return;
    const peek = 0.004 + p * 0.016 + extra * 0.05;
    g.position.y = peek;
    g.position.z = 0.003 + slot * 0.001 + p * 0.004;
    g.rotation.x = -0.02 - extra * 0.2;
    g.rotation.z = (slot - 2) * 0.008;
    g.visible = ripping.current ? extra < 0.96 : !torn;
  });

  return (
    <group ref={group}>
      <mesh material={edge} raycast={() => null}>
        <boxGeometry args={[CARD_W, CARD_H, 0.0016]} />
      </mesh>
      <mesh
        position={[0, 0, 0.001]}
        material={face}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(card.uid);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (ripping.current) return;
          ripping.current = true;
          rip.current = tween(0, 1, 0.2, easeOutBack);
        }}
      >
        <planeGeometry args={[CARD_W, CARD_H]} />
      </mesh>
    </group>
  );
}

function Hand({ side, skin, knuckle, nail }: { side: 1 | -1; skin: THREE.Material; knuckle: THREE.Material; nail: THREE.Material }) {
  return (
    <group position={[side * 0.116, -0.016, 0.01]} rotation={[0.18, side * -0.18, side * 0.14]}>
      <mesh position={[0, -0.008, -0.006]} material={skin} raycast={() => null}>
        <boxGeometry args={[0.042, 0.07, 0.02]} />
      </mesh>
      <mesh position={[side * -0.01, 0.016, 0.018]} rotation={[0.5, 0, side * 0.5]} material={skin} raycast={() => null}>
        <boxGeometry args={[0.014, 0.036, 0.013]} />
      </mesh>
      <mesh position={[side * -0.016, 0.032, 0.03]} rotation={[0.2, 0, side * 0.18]} material={nail} raycast={() => null}>
        <boxGeometry args={[0.009, 0.009, 0.003]} />
      </mesh>
      {[-0.024, -0.008, 0.008, 0.02].map((_, i) => (
        <group key={i} position={[side * 0.014, 0.032, -0.002]} rotation={[1.12 + i * 0.05, 0, side * 0.08]}>
          <mesh position={[0, 0.016, 0]} material={i % 2 ? knuckle : skin} raycast={() => null}>
            <boxGeometry args={[0.012, 0.032, 0.011]} />
          </mesh>
          <mesh position={[0, 0.032, 0.003]} material={nail} raycast={() => null}>
            <boxGeometry args={[0.009, 0.007, 0.003]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Open wallet is a camera viewmodel: drawn on top of the world, scaled to the
 * frustum so looking down always shows the whole bifold in front of you.
 */
export function Wallet({
  game,
  leather: leatherMap,
  suede: suedeMap,
}: {
  game: WildAlleyGame;
  leather: THREE.Texture;
  suede: THREE.Texture;
}) {
  const root = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const openK = useRef(0);
  const { camera, size } = useThree();
  const [hover, setHover] = useState<string | null>(null);
  const leather = useMemo(() => retroMapped(leatherMap, "#d4b08a", { snap: false }), [leatherMap]);
  const suede = useMemo(() => retroMapped(suedeMap, "#a05048", { snap: false }), [suedeMap]);
  const stitch = retro("#c4a070");
  const brass = retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.28 });
  const pocket = retro("#4a281c");
  const plastic = retro("#d8e8f0", { transparent: true, opacity: 0.22 });
  const skin = retro("#d2a078");
  const knuckle = retro("#c49068");
  const nail = retro("#efe0cc");
  const s = game.session;
  const sab = s.canSabotage();
  const cards = sab ? s.sabotageHands[1 - s.player]! : s.hand;
  const idMap = useMemo(() => paintIdCard(s.names[s.player] ?? "Ace"), [s.names, s.player]);
  const idMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: idMap,
        color: "#ffffff",
        depthTest: false,
        depthWrite: false,
      }),
    [idMap],
  );
  const bills = useMemo(
    () =>
      ([5, 1, 10] as const).map((n, i) => ({
        n,
        mat: new THREE.MeshBasicMaterial({
          map: paintBill(n),
          color: "#ffffff",
          depthTest: false,
          depthWrite: false,
        }),
        rot: -0.18 + i * 0.16,
        y: -0.028 + i * 0.004,
        z: 0.006 + i * 0.0015,
      })),
    [],
  );

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const want = s.walletOpen ? 1 : 0;
    openK.current += (want - openK.current) * (1 - Math.exp(-12 * dt));
    if (openK.current < 0.001) openK.current = 0;
    if (openK.current > 0.999) openK.current = 1;
    const k = openK.current;
    const g = root.current;
    const hold = inner.current;
    if (!g || !hold) return;
    if (k <= 0.04) {
      g.visible = false;
      return;
    }
    g.visible = true;
    asViewmodel(g);
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 64;
    const aspect = size.width / Math.max(1, size.height);
    const half = ((fov * Math.PI) / 180) / 2;
    const dist = 0.36;
    const visH = 2 * Math.tan(half) * dist;
    const visW = visH * Math.max(0.42, aspect);
    const looking = s.seated && (isLookingAtLap(s.lookPitch) || s.lookPitch > 0.28 || s.walletPinned);
    const fillW = looking ? 0.64 : 0.52;
    const fillH = looking ? 0.32 : 0.24;
    const sc = Math.max(0.8, Math.min(2.1, Math.min((visW * fillW) / SPAN_W, (visH * fillH) / SPAN_H)));
    _off.set(0, looking ? 0.08 : -0.055, -dist);
    _off.applyQuaternion(camera.quaternion);
    g.position.add(_off);
    _euler.set(looking ? -0.02 : -0.32, 0, 0);
    _tilt.setFromEuler(_euler);
    g.quaternion.multiply(_tilt);
    g.scale.setScalar(sc);
    if (left.current) left.current.rotation.y = -1.18 * (1 - k);
    if (right.current) right.current.rotation.y = 1.18 * (1 - k);
    if (import.meta.env.DEV && typeof window !== "undefined") {
      (window as unknown as { __walletFit?: Record<string, number | boolean> }).__walletFit = {
        dist,
        sc: Number(sc.toFixed(3)),
        looking,
        fov: Number(fov.toFixed(2)),
        aspect: Number(aspect.toFixed(3)),
        visW: Number(visW.toFixed(3)),
        visH: Number(visH.toFixed(3)),
        pitch: Number(s.lookPitch.toFixed(3)),
        k: Number(k.toFixed(3)),
      };
    }
  });

  return (
    <group ref={root} visible={false} frustumCulled={false} renderOrder={1200}>
      <group ref={inner}>
        <Hand side={-1} skin={skin} knuckle={knuckle} nail={nail} />
        <Hand side={1} skin={skin} knuckle={knuckle} nail={nail} />

        <mesh material={leather} raycast={() => null}>
          <boxGeometry args={[0.014, LEAF_H + 0.004, 0.012]} />
        </mesh>
        <mesh position={[0, 0, 0.001]} material={stitch} raycast={() => null}>
          <boxGeometry args={[0.004, LEAF_H - 0.01, 0.013]} />
        </mesh>

        <group ref={left} position={[-0.007, 0, 0]}>
          <mesh position={[-LEAF_W / 2, 0, 0]} material={leather} raycast={() => null}>
            <boxGeometry args={[LEAF_W, LEAF_H, LEAF_T]} />
          </mesh>
          <mesh position={[-LEAF_W / 2, 0, LEAF_T * 0.55]} material={suede} raycast={() => null}>
            <boxGeometry args={[LEAF_W - 0.012, LEAF_H - 0.012, 0.002]} />
          </mesh>
          <mesh position={[-LEAF_W / 2, 0.028, LEAF_T * 0.7]} material={pocket} raycast={() => null}>
            <boxGeometry args={[0.1, 0.062, 0.003]} />
          </mesh>
          <mesh position={[-LEAF_W / 2, 0.03, LEAF_T * 0.9]} material={idMat} raycast={() => null}>
            <planeGeometry args={[0.086, 0.054]} />
          </mesh>
          <mesh position={[-LEAF_W / 2, 0.03, LEAF_T * 0.95]} material={plastic} raycast={() => null}>
            <planeGeometry args={[0.092, 0.06]} />
          </mesh>
          {bills.map((b) => (
            <mesh
              key={b.n}
              position={[-LEAF_W / 2 + 0.01, b.y, LEAF_T * 0.85 + b.z]}
              rotation={[0, 0, b.rot]}
              material={b.mat}
              raycast={() => null}
            >
              <planeGeometry args={[0.078, 0.034]} />
            </mesh>
          ))}
          <mesh position={[-LEAF_W / 2, -0.042, LEAF_T * 0.7]} material={pocket} raycast={() => null}>
            <boxGeometry args={[0.1, 0.022, 0.004]} />
          </mesh>
          <mesh position={[-LEAF_W + 0.012, 0, 0]} material={brass} raycast={() => null}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 8]} />
          </mesh>
        </group>

        <group ref={right} position={[0.007, 0, 0]}>
          <mesh position={[LEAF_W / 2, 0, 0]} material={leather} raycast={() => null}>
            <boxGeometry args={[LEAF_W, LEAF_H, LEAF_T]} />
          </mesh>
          <mesh position={[LEAF_W / 2, 0, LEAF_T * 0.55]} material={suede} raycast={() => null}>
            <boxGeometry args={[LEAF_W - 0.012, LEAF_H - 0.012, 0.002]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[LEAF_W / 2, -0.032 + i * 0.015, LEAF_T * 0.72 + i * 0.0012]}
              material={pocket}
              raycast={() => null}
            >
              <boxGeometry args={[0.102, 0.028, 0.003]} />
            </mesh>
          ))}
          {cards.map((card, i) => (
            <group key={card.uid} position={[LEAF_W / 2, -0.026 + i * 0.014, LEAF_T * 0.82 + i * 0.001]}>
              <SlotCard
                card={card}
                selected={!sab && s.selected.includes(card.uid)}
                slot={i}
                hover={hover === card.uid}
                torn={!sab && s.selected.includes(card.uid)}
                onHover={(id) => {
                  setHover(id);
                  if (s.hoverUid !== id) {
                    s.setHover(id);
                    game.onUi();
                  }
                }}
                onTear={() => {
                  if (sab) game.sabotage(card.uid);
                  else {
                    if (!s.selected.includes(card.uid) && s.selected.length >= 2) return;
                    game.toggleCard(card.uid);
                  }
                }}
              />
            </group>
          ))}
          {cards.length === 0 &&
            Array.from({ length: SLOTS }).map((_, i) => (
              <mesh key={`empty-${i}`} position={[LEAF_W / 2, -0.018 + i * 0.015, LEAF_T * 0.85]} material={pocket} raycast={() => null}>
                <boxGeometry args={[0.08, 0.004, 0.001]} />
              </mesh>
            ))}
        </group>
      </group>
    </group>
  );
}
