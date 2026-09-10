export class Juice {
  trauma = 0;
  hitstop = 0;
  time = 0;
  reduced = false;

  addTrauma(v: number) {
    if (this.reduced) {
      this.trauma = Math.min(0.25, this.trauma + v * 0.25);
      return;
    }
    this.trauma = Math.min(1, this.trauma + v);
  }

  freeze(sec: number) {
    if (this.reduced) return;
    this.hitstop = Math.max(this.hitstop, sec);
  }

  step(dt: number) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    if (this.hitstop > 0) this.hitstop = Math.max(0, this.hitstop - dt);
  }

  offset() {
    const s = this.trauma * this.trauma;
    if (s <= 0.001) return { x: 0, y: 0, rot: 0 };
    const t = this.time * 37;
    return {
      x: s * 14 * Math.sin(t * 1.7),
      y: s * 10 * Math.cos(t * 1.9),
      rot: s * 0.018 * Math.sin(t * 2.3),
    };
  }
}
