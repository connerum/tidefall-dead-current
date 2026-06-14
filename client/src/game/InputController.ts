// Shared input settings so the menu and the InputController stay in sync.
export interface InputSettings {
  sensitivity: number; // multiplier, ~1.0 default
  invertY: boolean;
}

const SETTINGS_KEY = "tidefall_inputSettings";
const BASE_SENSITIVITY = 0.0022;

export function loadInputSettings(): InputSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InputSettings>;
      return {
        sensitivity: typeof parsed.sensitivity === "number" ? parsed.sensitivity : 1,
        invertY: !!parsed.invertY,
      };
    }
  } catch {
    /* ignore */
  }
  return { sensitivity: 1, invertY: false };
}

export function saveInputSettings(s: InputSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export class InputController {
  keys = new Set<string>();
  // accumulated look delta for this frame (yaw, pitch) in radians
  mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  locked = false;
  firePressed = false;
  adsPressed = false;
  onPointerLockChange?: (locked: boolean) => void;
  onAction?: (action: string) => void;

  private canvas: HTMLCanvasElement;
  private settings: InputSettings;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.settings = loadInputSettings();
    this.bindEvents();
  }

  getSettings(): InputSettings {
    return this.settings;
  }

  setSettings(s: InputSettings): void {
    this.settings = s;
    saveInputSettings(s);
  }

  private bindEvents(): void {
    document.addEventListener("keydown", (e) => {
      // Don't capture movement keys while typing in an input/textarea.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      this.keys.add(e.code);
      // Action keys must only fire on the initial press. Without this, OS
      // key auto-repeat fires keydown many times per press, which toggles
      // panels open->closed (so F/B/M appear to "do nothing") and makes V
      // spawn a boat then immediately exit it.
      if (e.repeat) return;
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
      if (e.code === "KeyT") this.onAction?.("chat");
      if (e.code === "Escape") this.onAction?.("escape");
      if (e.code === "Tab") {
        e.preventDefault();
        this.onAction?.("inventory");
      }
      if (e.code === "F1") {
        e.preventDefault();
        this.onAction?.("debug");
      }
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
      // Drop held keys when losing focus to avoid "stuck key" movement.
      if (!this.locked) {
        this.keys.clear();
        this.firePressed = false;
        this.adsPressed = false;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      const sens = BASE_SENSITIVITY * this.settings.sensitivity;
      // Standard FPS convention: moving the mouse right looks right,
      // moving it down looks down. Three.js camera forward is -Z, and a
      // positive yaw rotates the view to the LEFT, a positive pitch tilts
      // it UP. Therefore we NEGATE both axes to get the expected behaviour.
      this.mouse.dx -= e.movementX * sens;
      const ySign = this.settings.invertY ? 1 : -1;
      this.mouse.dy += e.movementY * sens * ySign;
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
    this.mouse.y = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.mouse.y + this.mouse.dy));
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  resetMouse(): void {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  clearKeys(): void {
    this.keys.clear();
    this.firePressed = false;
    this.adsPressed = false;
  }
}
