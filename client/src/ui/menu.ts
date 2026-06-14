import { loadInputSettings, saveInputSettings } from "../game/InputController.js";

export class MenuUI {
  private root: HTMLElement;
  private onConnect: (name: string) => void;

  constructor(onConnect: (name: string) => void) {
    this.onConnect = onConnect;
    // IMPORTANT: the menu must live in its own container. If it wrote
    // directly into #ui-root, show()/hide() would wipe the HUD, inventory,
    // crafting, map and death-screen overlays out of the DOM — which is why
    // those panels appeared to "do nothing" during gameplay.
    this.root = document.createElement("div");
    this.root.className = "menu-container";
    document.getElementById("ui-root")!.appendChild(this.root);
  }

  show(): void {
    const s = loadInputSettings();
    this.root.innerHTML = `
      <div class="menu-overlay">
        <h1 class="game-title">TIDEFALL</h1>
        <h2 class="game-subtitle">DEAD CURRENT</h2>
        <div class="menu-panel">
          <label>Raider Name</label>
          <input type="text" id="player-name" value="Raider" maxlength="20" />
          <button id="connect-btn">Enter the Dead Current</button>
          <div class="settings-row">
            <label class="setting-label">Mouse Sensitivity <span id="sens-val">${s.sensitivity.toFixed(2)}</span></label>
            <input type="range" id="sens-slider" min="0.2" max="3" step="0.05" value="${s.sensitivity}" />
          </div>
          <div class="settings-row">
            <label class="setting-label">Invert Vertical Look</label>
            <input type="checkbox" id="invert-y" ${s.invertY ? "checked" : ""} />
          </div>
          <div class="controls-hint">
            <p><strong>WASD</strong> Move · <strong>Mouse</strong> Look · <strong>LMB</strong> Fire · <strong>RMB</strong> Aim</p>
            <p><strong>Tab</strong> or <strong>F</strong> Inventory · <strong>B</strong> Crafting · <strong>M</strong> Map</p>
            <p><strong>E</strong> Interact / Loot / Bank · <strong>V</strong> Spawn · Board · Exit Boat</p>
            <p><strong>R</strong> Reload · <strong>1-3</strong> Weapons · <strong>G</strong> Grenade · <strong>Shift</strong> Sprint · <strong>Ctrl</strong> Crouch</p>
          </div>
        </div>
      </div>
    `;
    const btn = document.getElementById("connect-btn") as HTMLButtonElement;
    const input = document.getElementById("player-name") as HTMLInputElement;
    const slider = document.getElementById("sens-slider") as HTMLInputElement;
    const sensVal = document.getElementById("sens-val") as HTMLSpanElement;
    const invert = document.getElementById("invert-y") as HTMLInputElement;

    slider.addEventListener("input", () => {
      sensVal.textContent = Number(slider.value).toFixed(2);
      saveInputSettings({ sensitivity: Number(slider.value), invertY: invert.checked });
    });
    invert.addEventListener("change", () => {
      saveInputSettings({ sensitivity: Number(slider.value), invertY: invert.checked });
    });

    btn.addEventListener("click", () => this.onConnect(input.value.trim() || "Raider"));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.onConnect(input.value.trim() || "Raider");
    });
  }

  hide(): void {
    this.root.innerHTML = "";
  }
}
