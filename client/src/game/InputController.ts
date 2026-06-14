export class InputController {
  keys = new Set<string>();
  mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  locked = false;
  firePressed = false;
  adsPressed = false;
  onPointerLockChange?: (locked: boolean) => void;
  onAction?: (action: string) => void;

  private canvas: HTMLCanvasElement;
  private sensitivity = 0.002;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (e.code === "KeyE") this.onAction?.("interact");
      if (e.code === "KeyF") this.onAction?.("inventory");
      if (e.code === "KeyB") this.onAction?.("crafting");
      if (e.code === "KeyM") this.onAction?.("map");
      if (e.code === "KeyG") this.onAction?.("grenade");
      if (e.code === "KeyV") this.onAction?.("boat");
      if (e.code === "Digit1") this.onAction?.("slot1");
      if (e.code === "Digit2") this.onAction?.("slot2");
      if (e.code === "Digit3") this.onAction?.("slot3");
      if (e.code === "KeyR") this.onAction?.("reload");
      if (e.code === "Escape") this.onAction?.("escape");
      if (e.code === "F1") this.onAction?.("debug");
    });

    document.addEventListener("keyup", (e) => this.keys.delete(e.code));

    this.canvas.addEventListener("click", () => {
      if (!this.locked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.onPointerLockChange?.(this.locked);
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.mouse.dx += e.movementX * this.sensitivity;
      this.mouse.dy += e.movementY * this.sensitivity;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.firePressed = true;
      if (e.button === 2) this.adsPressed = true;
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.firePressed = false;
      if (e.button === 2) this.adsPressed = false;
    });

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  update(): void {
    this.mouse.x += this.mouse.dx;
    this.mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouse.y + this.mouse.dy));
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  resetMouse(): void {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }
}
