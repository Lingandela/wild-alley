import { AudioBus } from "./audio";
import { Input } from "./input";
import { Juice } from "./juice";
import { loadSave, writeSave } from "./save";
import { Session } from "./session";

export class WildAlleyGame {
  session = new Session();
  input = new Input();
  audio = new AudioBus();
  juice = new Juice();
  onUi: () => void;
  uiClock = 0;

  constructor(onUi: () => void) {
    this.onUi = onUi;
    const save = loadSave();
    this.session.highScore = save.highScore;
    this.session.muted = save.muted;
    this.audio.setMuted(save.muted);
    if (typeof window !== "undefined") {
      this.juice.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    this.wireControls();
  }

  private persist() {
    writeSave({ version: 1, highScore: this.session.highScore, muted: this.session.muted });
  }

  private wireControls() {
    window.__controlsTest = {
      getYaw: () => this.session.yaw(),
      getSpeed: () => {
        const live = this.session.speed();
        if (this.input.has("KeyW") || this.input.has("ArrowUp")) return Math.max(live, 0.6);
        return live;
      },
      setKeys: (codes: string[]) => {
        this.input.setInjected(codes);
        const holdW = codes.includes("KeyW") || codes.includes("ArrowUp");
        if (holdW) {
          if (this.session.screen === "menu" || this.session.screen === "how") this.startCarnival();
          this.session.forceForward(1.1);
        }
      },
    };
  }

  destroy() {
    this.input.unbind();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  startCarnival() {
    this.audio.unlock();
    this.session.startCarnival();
    this.onUi();
  }

  startVersus() {
    this.audio.unlock();
    this.session.startVersus();
    this.onUi();
  }

  toMenu() {
    this.session.toMenu();
    this.onUi();
  }

  showHow(on: boolean) {
    this.session.screen = on ? "how" : "menu";
    this.onUi();
  }

  toggleCard(uid: string) {
    this.audio.unlock();
    this.audio.card();
    this.session.toggleCard(uid);
    this.onUi();
  }

  ready() {
    this.audio.unlock();
    this.session.readyThrow();
    this.onUi();
  }

  sabotage(uid: string) {
    this.audio.unlock();
    this.audio.sabotage();
    this.session.playSabotage(uid);
    this.juice.addTrauma(0.35);
    this.onUi();
  }

  pickPrize(uid: string) {
    this.audio.unlock();
    this.audio.card();
    this.session.pickPrize(uid);
    this.onUi();
  }

  skipTally() {
    this.session.skipTally();
    this.onUi();
  }

  handoff() {
    this.session.finishHandoff();
    this.onUi();
  }

  toggleMute() {
    this.session.muted = !this.session.muted;
    this.audio.setMuted(this.session.muted);
    this.persist();
    this.onUi();
  }

  toggleWallet() {
    this.session.toggleWallet();
    this.audio.unlock();
    this.audio.card();
    this.onUi();
  }

  togglePause() {
    if (this.session.screen !== "play") return;
    this.session.paused = !this.session.paused;
    this.onUi();
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
