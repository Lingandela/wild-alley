/** Critically-damped springs + a tiny tween bus. Replaces ad-hoc exp lerps. */

export type Spring = {
  value: number;
  vel: number;
  target: number;
  /** Angular frequency. Higher = snappier. */
  omega: number;
  /** Damping ratio. 1 = critical, <1 bounce, >1 sluggish. */
  zeta: number;
};

export function spring(value = 0, omega = 16, zeta = 0.86): Spring {
  return { value, vel: 0, target: value, omega, zeta };
}

export function setSpring(s: Spring, target: number, omega?: number, zeta?: number) {
  s.target = target;
  if (omega != null) s.omega = omega;
  if (zeta != null) s.zeta = zeta;
}

export function stepSpring(s: Spring, dt: number) {
  const w = s.omega;
  const acc = -w * w * (s.value - s.target) - 2 * s.zeta * w * s.vel;
  s.vel += acc * dt;
  s.value += s.vel * dt;
  if (!Number.isFinite(s.value) || Math.abs(s.value) > 8) {
    s.value = s.target;
    s.vel = 0;
  }
  if (Math.abs(s.value - s.target) < 0.0004 && Math.abs(s.vel) < 0.002) {
    s.value = s.target;
    s.vel = 0;
  }
  return s.value;
}

export type VecSpring = {
  x: Spring;
  y: Spring;
  z: Spring;
};

export function vecSpring(x = 0, y = 0, z = 0, omega = 14, zeta = 0.9): VecSpring {
  return { x: spring(x, omega, zeta), y: spring(y, omega, zeta), z: spring(z, omega, zeta) };
}

export function stepVec(v: VecSpring, dt: number) {
  stepSpring(v.x, dt);
  stepSpring(v.y, dt);
  stepSpring(v.z, dt);
}

export type Tween = {
  t: number;
  dur: number;
  from: number;
  to: number;
  ease: (u: number) => number;
  done: boolean;
};

export function tween(from: number, to: number, dur: number, ease: (u: number) => number = easeOutCubic): Tween {
  return { t: 0, dur, from, to, ease, done: false };
}

export function stepTween(tw: Tween, dt: number) {
  if (tw.done) return tw.to;
  tw.t += dt;
  const u = Math.min(1, tw.t / Math.max(0.0001, tw.dur));
  if (u >= 1) tw.done = true;
  return tw.from + (tw.to - tw.from) * tw.ease(u);
}

export function easeOutCubic(u: number) {
  const t = 1 - u;
  return 1 - t * t * t;
}

export function easeOutBack(u: number) {
  const c = 1.70158;
  const t = u - 1;
  return 1 + (c + 1) * t * t * t + c * t * t;
}

export function easeInBack(u: number) {
  const c = 1.70158;
  return (c + 1) * u * u * u - c * u * u;
}

/** Per-id spring bag so wallet flaps / tickets / bob share one clock. */
export class AnimBus {
  private map = new Map<string, Spring>();

  get(id: string, seed = 0, omega = 16, zeta = 0.86) {
    let s = this.map.get(id);
    if (!s) {
      s = spring(seed, omega, zeta);
      this.map.set(id, s);
    }
    return s;
  }

  to(id: string, target: number, omega?: number, zeta?: number) {
    const s = this.get(id, 0, omega ?? 16, zeta ?? 0.86);
    setSpring(s, target, omega, zeta);
    return s;
  }

  tick(id: string, dt: number) {
    return stepSpring(this.get(id), dt);
  }

  value(id: string) {
    return this.map.get(id)?.value ?? 0;
  }

  clear() {
    this.map.clear();
  }
}
