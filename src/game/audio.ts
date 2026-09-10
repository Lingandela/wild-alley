export class AudioBus {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  muted = false;
  unlocked = false;

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.master.gain.value = this.muted ? 0 : 0.85;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.02);
    }
  }

  private env(g: GainNode, peak: number, dur: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(freq: number, dur: number, type: OscillatorType, peak: number, detune = 0) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq * (0.97 + Math.random() * 0.06);
    o.detune.value = detune;
    o.connect(g);
    g.connect(this.sfx);
    this.env(g, peak, dur);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  private noise(dur: number, peak: number, hp = 400) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const n = this.ctx.createBufferSource();
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    n.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    this.env(g, peak, dur);
    n.start();
    n.stop(this.ctx.currentTime + dur + 0.02);
  }

  whoosh(power: number) {
    this.noise(0.22, 0.12 + power * 0.12, 300);
    this.tone(180 + power * 90, 0.18, "sine", 0.08);
  }

  wood(mag: number) {
    this.tone(90 + mag * 40, 0.12, "sine", 0.1);
    this.noise(0.08, 0.08, 200);
  }

  bumper() {
    this.tone(520, 0.14, "triangle", 0.1);
    this.tone(780, 0.1, "sine", 0.05);
  }

  peg() {
    this.tone(900, 0.06, "square", 0.04);
  }

  chime(value: number) {
    const base = 420 + Math.min(value, 120) * 1.6;
    this.tone(base, 0.55, "sine", 0.11);
    this.tone(base * 1.5, 0.45, "sine", 0.05);
    this.tone(base * 2, 0.3, "triangle", 0.03);
  }

  gutter() {
    this.tone(140, 0.35, "sawtooth", 0.05);
    this.tone(90, 0.4, "sine", 0.07);
  }

  card() {
    this.noise(0.07, 0.06, 900);
    this.tone(240, 0.08, "triangle", 0.04);
  }

  tally() {
    this.tone(660, 0.12, "sine", 0.07);
  }

  win() {
    this.tone(523, 0.25, "sine", 0.08);
    this.tone(659, 0.3, "sine", 0.07);
    this.tone(784, 0.45, "sine", 0.06);
  }

  sabotage() {
    this.tone(180, 0.2, "sawtooth", 0.06);
    this.tone(110, 0.28, "sine", 0.07);
  }

  flipper() {
    this.tone(200, 0.08, "square", 0.05);
  }
}
