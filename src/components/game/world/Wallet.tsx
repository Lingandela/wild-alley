import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import type { UiCard } from "@/game/types";
import { AnimBus, easeOutBack, spring, stepSpring, tween, stepTween } from "@/game/anim";
import { paintTearTicket, retro } from "@/game/retroMat";

function Stub({
  card,
  selected,
  slot,
  n,
  hover,
  torn,
  onHover,
  onTear,
}: {
  card: UiCard;
  selected: boolean;
  slot: number;
  n: number;
  hover: boolean;
  torn: boolean;
  onHover: (id: string | null) => void;
  onTear: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const pull = useRef(spring(0, 22, 0.78));
  const rip = useRef(tween(0, 0, 0.01));
  const ripping = useRef(false);
  const map = useMemo(
    () => paintTearTicket(card.name, card.type, card.text, selected),
    [card.name, card.type, card.text, selected],
  );
  const mat = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      map,
      color: "#ffffff",
      emissive: selected ? "#c47a3a" : "#1a1010",
      emissiveIntensity: selected ? 0.22 : 0.05,
      flatShading: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, [map, selected]);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    pull.current.target = torn ? 1 : hover ? 0.55 : selected ? 0.32 : 0.08;
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
    const y = 0.05 + p * 0.16 + extra * 0.38;
    const z = 0.01 - p * 0.02;
    g.position.set(0, y, z);
    g.rotation.set(-0.08 - extra * 0.5, 0, (slot - (n - 1) / 2) * 0.015);
    g.visible = extra < 0.98;
  });

  return (
    <group ref={group}>
      <mesh
        material={mat}
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
          rip.current = tween(0, 1, 0.22, easeOutBack);
        }}
      >
        <planeGeometry args={[0.152, 0.28]} />
      </mesh>
    </group>
  );
}

export function Wallet({ game }: { game: WildAlleyGame }) {
  const root = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const bus = useRef(new AnimBus());
  const { camera } = useThree();
  const [hover, setHover] = useState<string | null>(null);
  const leather = retro("#3a2014");
  const lining = retro("#6a3420");
  const stitch = retro("#c4a070");
  const skin = retro("#e6c8a8");
  const brass = retro("#c47a3a", { emissive: "#c47a3a", emissiveIntensity: 0.25 });

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const s = game.session;
    const open = bus.current.to("open", s.walletOpen ? 1 : 0, 13, 0.78);
    bus.current.tick("open", dt);
    const k = open.value;
    const g = root.current;
    const hold = inner.current;
    if (!g || !hold) return;
    g.visible = k > 0.03;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    hold.position.set(0, -0.22 + k * 0.05, -0.38);
    hold.rotation.set(-1.12 + k * 0.42, 0, 0);
    if (left.current) left.current.rotation.y = -1.22 * (1 - k);
    if (right.current) right.current.rotation.y = 1.22 * (1 - k);
  });

  const s = game.session;
  const sab = s.canSabotage();
  const cards = sab ? s.sabotageHands[1 - s.player]! : s.hand;
  const n = Math.max(1, cards.length);

  return (
    <group ref={root} visible={false}>
      <group ref={inner}>
        <pointLight position={[0, 0.16, 0.12]} intensity={3.4} distance={0.85} color="#ffe0b0" />
        <mesh position={[-0.18, 0.02, 0.16]} rotation={[0.5, 0.2, -0.7]} material={skin}>
          <boxGeometry args={[0.09, 0.03, 0.1]} />
        </mesh>
        <mesh position={[0.2, 0.02, 0.16]} rotation={[0.45, -0.15, 0.65]} material={skin}>
          <boxGeometry args={[0.085, 0.028, 0.095]} />
        </mesh>

        <group ref={left} position={[-0.118, 0, 0]}>
          <mesh position={[-0.118, 0, 0]} material={leather}>
            <boxGeometry args={[0.236, 0.018, 0.3]} />
          </mesh>
          <mesh position={[-0.118, 0.01, 0]} material={lining}>
            <boxGeometry args={[0.21, 0.004, 0.27]} />
          </mesh>
          <mesh position={[-0.118, 0.014, 0.02]} material={retro("#d8c8a8")}>
            <boxGeometry args={[0.16, 0.002, 0.1]} />
          </mesh>
          <mesh position={[-0.118, 0.02, -0.08]} material={brass}>
            <boxGeometry args={[0.12, 0.006, 0.04]} />
          </mesh>
        </group>

        <mesh material={stitch}>
          <boxGeometry args={[0.012, 0.022, 0.3]} />
        </mesh>

        <group ref={right} position={[0.118, 0, 0]}>
          <mesh position={[0.118, 0, 0]} material={leather}>
            <boxGeometry args={[0.236, 0.018, 0.3]} />
          </mesh>
          <mesh position={[0.118, 0.01, 0]} material={lining}>
            <boxGeometry args={[0.21, 0.004, 0.27]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0.118, 0.014 + i * 0.006, -0.04 + i * 0.018]} material={retro("#4a2818")}>
              <boxGeometry args={[0.176, 0.004, 0.078]} />
            </mesh>
          ))}
          {cards.map((card, i) => (
            <group key={card.uid} position={[0.118, 0.02 + i * 0.014, 0.02 + i * 0.022]}>
              <Stub
                card={card}
                selected={!sab && s.selected.includes(card.uid)}
                slot={i}
                n={n}
                hover={hover === card.uid}
                torn={!sab && s.selected.includes(card.uid)}
                onHover={setHover}
                onTear={() => {
                  if (sab) game.sabotage(card.uid);
                  else game.toggleCard(card.uid);
                }}
              />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
