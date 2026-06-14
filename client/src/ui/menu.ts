export class MenuUI {
  private root: HTMLElement;
  private onConnect: (name: string) => void;

  constructor(onConnect: (name: string) => void) {
    this.onConnect = onConnect;
    this.root = document.getElementById("ui-root")!;
  }

  show(): void {
    this.root.innerHTML = `
      <div class="menu-overlay">
        <h1 class="game-title">TIDEFALL</h1>
        <h2 class="game-subtitle">DEAD CURRENT</h2>
        <div class="menu-panel">
          <label>Raider Name</label>
          <input type="text" id="player-name" value="Raider" maxlength="20" />
          <button id="connect-btn">Enter the Dead Current</button>
          <div class="controls-hint">
            <p><strong>WASD</strong> Move · <strong>Mouse</strong> Look · <strong>LMB</strong> Fire · <strong>RMB</strong> Aim</p>
            <p><strong>E</strong> Interact · <strong>F</strong> Inventory · <strong>B</strong> Crafting · <strong>M</strong> Map</p>
            <p><strong>V</strong> Spawn/Board/Exit Boat · <strong>R</strong> Reload · <strong>Shift</strong> Sprint · <strong>Ctrl</strong> Crouch</p>
          </div>
        </div>
      </div>
    `;
    const btn = document.getElementById("connect-btn") as HTMLButtonElement;
    const input = document.getElementById("player-name") as HTMLInputElement;
    btn.addEventListener("click", () => this.onConnect(input.value.trim() || "Raider"));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.onConnect(input.value.trim() || "Raider");
    });
  }

  hide(): void {
    this.root.innerHTML = "";
  }
}
