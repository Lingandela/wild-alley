const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyE",
  "Escape",
  "Enter",
  "KeyF",
]);

export class Input {
  keys = new Set<string>();
  injected = new Set<string>();
  pointerDown = false;
  px = 0;
  py = 0;
  sx = 0;
  sy = 0;
  moveX = 0;
  moveY = 0;
  locked = false;
  canvas: HTMLCanvasElement | null = null;
  private unbinders: Array<() => void> = [];

  has(code: string) {
    return this.keys.has(code) || this.injected.has(code);
  }

  left() {
    return this.has("KeyA") || this.has("ArrowLeft");
  }

  right() {
    return this.has("KeyD") || this.has("ArrowRight");
  }

  down() {
    return this.has("KeyS") || this.has("ArrowDown");
  }

  up() {
    return this.has("KeyW") || this.has("ArrowUp") || this.has("Space");
  }

  setInjected(codes: string[]) {
    this.injected = new Set(codes);
  }

  consumeLook() {
    const x = this.moveX;
    const y = this.moveY;
    this.moveX = 0;
    this.moveY = 0;
    return { x, y };
  }

  bind(canvas: HTMLCanvasElement) {
    this.unbind();
    this.canvas = canvas;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (down) this.keys.add(e.code);
      else this.keys.delete(e.code);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => this.keys.clear();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.px = ((e.clientX - r.left) / r.width) * canvas.width;
      this.py = ((e.clientY - r.top) / r.height) * canvas.height;
    };
    const pd = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      this.pointerDown = true;
      toLocal(e);
      this.sx = this.px;
      this.sy = this.py;
    };
    const pm = (e: PointerEvent) => {
      toLocal(e);
      if (!this.locked && this.pointerDown) {
        this.moveX += e.movementX;
        this.moveY += e.movementY;
      }
    };
    const pu = (e: PointerEvent) => {
      toLocal(e);
      this.pointerDown = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        this.moveX += e.movementX;
        this.moveY += e.movementY;
      }
    };
    const lockChange = () => {
      this.locked = document.pointerLockElement === canvas;
    };
    const clickLock = () => {
      if (document.pointerLockElement === canvas) return;
      const req = canvas.requestPointerLock as (opts?: { unadjustedMovement?: boolean }) => Promise<void> | void;
      try {
        const p = req.call(canvas, { unadjustedMovement: true });
        if (p && typeof (p as Promise<void>).catch === "function") {
          (p as Promise<void>).catch(() => {
            canvas.requestPointerLock();
          });
        }
      } catch {
        canvas.requestPointerLock();
      }
    };

    canvas.addEventListener("pointerdown", pd);
    canvas.addEventListener("pointermove", pm);
    canvas.addEventListener("pointerup", pu);
    canvas.addEventListener("pointercancel", pu);
    canvas.addEventListener("click", clickLock);
    document.addEventListener("mousemove", mm);
    document.addEventListener("pointerlockchange", lockChange);

    this.unbinders = [
      () => window.removeEventListener("keydown", kd),
      () => window.removeEventListener("keyup", ku),
      () => window.removeEventListener("blur", clear),
      () => canvas.removeEventListener("pointerdown", pd),
      () => canvas.removeEventListener("pointermove", pm),
      () => canvas.removeEventListener("pointerup", pu),
      () => canvas.removeEventListener("pointercancel", pu),
      () => canvas.removeEventListener("click", clickLock),
      () => document.removeEventListener("mousemove", mm),
      () => document.removeEventListener("pointerlockchange", lockChange),
    ];
  }

  unbind() {
    for (const u of this.unbinders) u();
    this.unbinders = [];
    this.keys.clear();
    this.pointerDown = false;
    this.locked = false;
  }
}
