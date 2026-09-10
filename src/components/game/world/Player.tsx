import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, interactionGroups, useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import type { KinematicCharacterController } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import type { WildAlleyGame } from "@/game/game";
import { AnimBus } from "@/game/anim";
import { COL, SEAT, SPAWN, seatEye, seatLook } from "@/game/layout3d";

const EYE = 0.7;
const WALK = 3.15;
const STRAFE = 2.85;
const SENS = 0.00205;

export function Player({ game }: { game: WildAlleyGame }) {
  const body = useRef<RapierRigidBody>(null);
  const { world } = useRapier();
  const { camera } = useThree();
  const ctrl = useRef<KinematicCharacterController | null>(null);
  const vy = useRef(0);
  const bob = useRef(new AnimBus());
  const lookDown = useRef(new AnimBus());
  const grounded = useRef(true);
  const wish = useRef({ x: 0, z: 0 });
  const look = useRef(new THREE.Vector3(0, 1.7, -2.4));
  const wasSeated = useRef(false);

  useEffect(() => {
    const c = world.createCharacterController(0.04);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.enableAutostep(0.22, 0.2, false);
    c.enableSnapToGround(0.32);
    c.setMaxSlopeClimbAngle((38 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((50 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(false);
    c.setSlideEnabled(true);
    ctrl.current = c;
    return () => {
      world.removeCharacterController(c);
      ctrl.current = null;
    };
  }, [world]);

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const c = ctrl.current;
    if (!rb || !c) return;
    const s = game.session;
    if (s.seatLatch) {
      rb.setNextKinematicTranslation({ x: SEAT.x, y: SEAT.y, z: SEAT.z });
      s.playerX = SEAT.x;
      s.playerZ = SEAT.z;
      s.seatLatch = false;
      return;
    }
    const col = rb.collider(0);
    if (!col) return;
    const dt = 1 / 60;
    const w = wish.current;
    let grav = vy.current;
    if (!grounded.current) grav -= 28 * dt;
    else if (grav < 0) grav = -0.35;
    vy.current = grav;
    c.computeColliderMovement(col, { x: w.x * dt, y: grav * dt, z: w.z * dt });
    grounded.current = c.computedGrounded();
    const mv = c.computedMovement();
    const t = rb.translation();
    let nx = t.x + mv.x;
    let ny = t.y + mv.y;
    let nz = t.z + mv.z;
    if (ny < -0.15 || Math.abs(nx) > 4.4 || nz > 5.2 || nz < -8.4) {
      nx = SPAWN.x;
      ny = SPAWN.y;
      nz = SPAWN.z;
      vy.current = 0;
    }
    rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    s.playerX = nx;
    s.playerZ = nz;
  });

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const s = game.session;
    const juice = game.juice.offset();
    s.pointerLocked = game.input.locked;
    const seated = s.seated && s.screen === "play" && s.phase !== "bonus";

    if (!s.paused && !s.walletOpen && !seated) {
      const m = game.input.consumeLook();
      s.lookYaw -= m.x * SENS;
      s.lookPitch -= m.y * SENS;
      const lim = Math.PI / 2 - 0.05;
      if (s.lookPitch > lim) s.lookPitch = lim;
      if (s.lookPitch < -lim) s.lookPitch = -lim;
    } else {
      game.input.consumeLook();
    }

    const yaw = s.lookYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let fwd = 0;
    let sid = 0;
    const canWalk = !s.paused && !s.walletOpen && s.screen !== "how" && !seated;
    if (canWalk) {
      if (game.input.has("KeyW") || game.input.has("ArrowUp")) fwd += 1;
      if (game.input.down()) fwd -= 1;
      if (game.input.left()) sid -= 1;
      if (game.input.right()) sid += 1;
    }
    const len = Math.hypot(fwd, sid) || 1;
    fwd /= len;
    sid /= len;
    const wishX = fx * fwd * WALK + rx * sid * STRAFE;
    const wishZ = fz * fwd * WALK + rz * sid * STRAFE;
    wish.current.x = wishX;
    wish.current.z = wishZ;
    const spd = Math.hypot(wishX, wishZ);
    s.playerSpeed = spd;
    if (spd > 0.08) s.moveHeading = Math.atan2(-wishX, -wishZ);

    const t = body.current?.translation();
    const px = t?.x ?? s.playerX;
    const py = t?.y ?? SPAWN.y;
    const pz = t?.z ?? s.playerZ;

    const down = lookDown.current.to("down", s.walletOpen ? 1 : 0, 14, 0.82);
    lookDown.current.tick("down", dt);

    if (seated) {
      const eye = seatEye();
      const tgt = seatLook();
      const charge = !s.walletOpen && s.charging ? s.power * 0.14 : 0;
      const tx = eye.x + s.aimX * 0.1;
      const ty = eye.y;
      const tz = eye.z + charge;
      const lx = tgt.x + s.aimX * 0.16;
      const ly = tgt.y - down.value * 0.12;
      const lz = tgt.z;
      if (!wasSeated.current) {
        camera.position.set(tx, ty, tz);
        look.current.set(lx, ly, lz);
        wasSeated.current = true;
      } else {
        const ease = 1 - Math.exp(-7 * dt);
        camera.position.x += (tx - camera.position.x) * ease;
        camera.position.y += (ty - camera.position.y) * ease;
        camera.position.z += (tz - camera.position.z) * ease;
        look.current.x += (lx - look.current.x) * ease;
        look.current.y += (ly - look.current.y) * ease;
        look.current.z += (lz - look.current.z) * ease;
      }
      camera.lookAt(look.current);
      camera.position.x += juice.x * 0.008;
      camera.position.y += juice.y * 0.006;
      camera.rotation.z = juice.rot * 0.45;
    } else if (s.phase === "bonus") {
      wasSeated.current = false;
      const side = s.bonus?.kind === "pinball" ? -3.35 : 3.35;
      const k = 1 - Math.exp(-4 * dt);
      camera.position.x += (side * 0.4 - camera.position.x) * k;
      camera.position.y += (2.4 - camera.position.y) * k;
      camera.position.z += (1.6 - camera.position.z) * k;
      camera.lookAt(side, 1.4, -1.3);
    } else {
      wasSeated.current = false;
      const pitch = s.lookPitch - down.value * 0.38;
      const traveling = grounded.current ? spd : 0;
      const bobAmt = bob.current.to("amp", traveling > 0.4 ? 1 : 0, 10, 0.8);
      bob.current.tick("amp", dt);
      const phase = s.time * (7.2 + spd * 0.4);
      const bobY = Math.sin(phase) * 0.024 * bobAmt.value;
      const bobX = Math.sin(phase * 0.5) * 0.014 * bobAmt.value;
      camera.position.set(px + bobX, py + EYE + bobY, pz);
      camera.rotation.order = "YXZ";
      camera.rotation.y = s.lookYaw;
      camera.rotation.x = pitch;
      camera.rotation.z = juice.rot;
      camera.position.x += juice.x * 0.01;
      camera.position.y += juice.y * 0.008;
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      const want = s.walletOpen ? 50 : seated ? 50 : 64;
      camera.fov += (want - camera.fov) * (1 - Math.exp(-5 * dt));
      camera.updateProjectionMatrix();
    }
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      lockRotations
      position={[SPAWN.x, SPAWN.y, SPAWN.z]}
      collisionGroups={interactionGroups([COL.player], [COL.static])}
      friction={0.9}
    >
      <CapsuleCollider args={[0.45, 0.26]} />
    </RigidBody>
  );
}
