import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { BALL_R3, ballWorld } from "@/game/layout3d";
import { retro } from "@/game/retroMat";

export function PlayBall({ game }: { game: WildAlleyGame }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const wood = retro("#ead7b0");
  const stripe = retro("#6a3a28");

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const s = game.session;
    const groups = [a.current, b.current];
    for (let i = 0; i < 2; i++) {
      const mesh = groups[i];
      const ball = s.balls[i];
      if (!mesh) continue;
      if (!ball || (!ball.alive && s.phase !== "aim" && s.phase !== "pick" && s.phase !== "intro" && s.phase !== "demo")) {
        mesh.visible = i === 0 && (s.phase === "aim" || s.phase === "pick" || s.phase === "intro");
        if (!mesh.visible) continue;
      }
      if (!ball) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const pull = s.phase === "aim" && s.charging && i === 0 ? s.power * 0.32 : 0;
      const w = ballWorld(s.lane, ball);
      mesh.position.set(w.x, w.y, w.z + pull);
      mesh.rotation.x -= ball.vy * dt * 3.4;
      mesh.rotation.z += ball.vx * dt * 3.4;
    }
  });

  return (
    <>
      <group ref={a}>
        <mesh material={wood}>
          <sphereGeometry args={[BALL_R3, 14, 12]} />
        </mesh>
        <mesh material={stripe} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[BALL_R3 * 0.72, 0.006, 5, 12]} />
        </mesh>
      </group>
      <group ref={b} visible={false}>
        <mesh material={wood}>
          <sphereGeometry args={[BALL_R3, 10, 8]} />
        </mesh>
      </group>
    </>
  );
}
