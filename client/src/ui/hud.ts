import * as THREE from "three";

export class HUD {
  private root: HTMLElement;
  private debug = false;
  private ping = 0;
  private contract: { contractId: string; progress: Record<string, number> } | null = null;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "hud";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  show(): void {
    this.render();
  }

  setPing(ping: number): void {
    this.ping = ping;
  }

  setContract(data: { contractId: string; progress: Record<string, number> } | null): void {
    this.contract = data;
  }

  setProfile(data: unknown): void {
    // Handled by rendering
  }

  showHitmarker(damage: number, headshot: boolean): void {
    const hit = document.createElement("div");
    hit.className = "hitmarker";
    hit.textContent = headshot ? "HEADSHOT" : String(damage);
    hit.style.left = "50%";
    hit.style.top = "45%";
    this.root.appendChild(hit);
    setTimeout(() => hit.remove(), 300);
  }

  toggleDebug(): void {
    this.debug = !this.debug;
  }

  update(player: { health: number; armor: number; inSafeZone: boolean; currentLocationId?: string; position: { x: number; z: number } } | null, locked: boolean, camera: THREE.Camera): void {
    this.render(player, locked, camera);
  }

  private render(player?: any, locked?: boolean, camera?: THREE.Camera): void {
    const crosshair = locked ? `<div class="crosshair"></div>` : "";
    const safeZone = player?.inSafeZone ? `<div class="safe-zone">SAFE ZONE</div>` : `<div class="open-waters">OPEN WATERS</div>`;
    const location = player?.currentLocationId || "Open Waters";
    const contractText = this.contract ? `Contract: ${this.contract.contractId}` : "No active contract";
    const debugInfo = this.debug && player && camera
      ? `<div class="debug">Pos: ${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)} | Ping: ${this.ping}ms | ${location}</div>`
      : "";

    this.root.innerHTML = `
      ${crosshair}
      <div class="hud-top-left">
        <div class="location">${location}</div>
        <div class="contract">${contractText}</div>
        ${safeZone}
      </div>
      <div class="hud-bottom-left">
        <div class="health-bar"><div class="health-fill" style="width:${player ? player.health : 0}%"></div></div>
        <div class="armor-bar"><div class="armor-fill" style="width:${player ? (player.armor / 50) * 100 : 0}%"></div></div>
        <div class="stats">HP ${Math.floor(player?.health ?? 0)} | ARMOR ${Math.floor(player?.armor ?? 0)}</div>
      </div>
      <div class="hud-bottom-right">
        <div class="ammo">-- / --</div>
        <div class="compass">N</div>
      </div>
      ${debugInfo}
    `;
  }
}
