import { LOCATIONS, SEA_LANES, STORM_WALL_RADIUS, WORLD_SIZE } from "@tidefall/shared";

const RISK_COLOR: Record<string, string> = {
  safe: "#33bbff",
  low: "#5fd35f",
  medium: "#ffaa33",
  high: "#ff4444",
};

/**
 * Top-down tactical map. Shows all islands coloured by risk, the storm-wall
 * boundary, sea lanes, and the player's live position + heading.
 */
export class MapUI {
  private root: HTMLElement;
  private player = { x: 0, z: 0, yaw: 0 };

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "map-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  setPlayer(x: number, z: number, yaw: number): void {
    this.player.x = x;
    this.player.z = z;
    this.player.yaw = yaw;
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private render(): void {
    const display = 560;
    const scale = display / WORLD_SIZE;
    const half = display / 2;

    const locations = Object.values(LOCATIONS)
      .map((loc) => {
        const x = half + loc.position.x * scale;
        const y = half + loc.position.z * scale;
        const color = RISK_COLOR[loc.riskLevel] ?? "#ccaa66";
        const r = Math.max(6, loc.radius * scale);
        return `
          <div class="map-location" style="left:${x}px;top:${y}px">
            <div class="map-loc-zone" style="width:${r * 2}px;height:${r * 2}px;background:radial-gradient(circle, ${color}55, ${color}00)"></div>
            <span style="border-color:${color};color:${color}">${loc.name}</span>
          </div>`;
      })
      .join("");

    const lanes = SEA_LANES.map((lane) => {
      const x1 = half + lane.start.x * scale;
      const y1 = half + lane.start.z * scale;
      const x2 = half + lane.end.x * scale;
      const y2 = half + lane.end.z * scale;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return `<div class="map-lane" style="left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${ang}deg)"></div>`;
    }).join("");

    const px = half + this.player.x * scale;
    const py = half + this.player.z * scale;
    // Screen-space forward (x right, y down): derive heading clockwise from up.
    const fx = -Math.sin(this.player.yaw);
    const fz = -Math.cos(this.player.yaw);
    const headingDeg = (Math.atan2(fx, -fz) * 180) / Math.PI;

    const stormR = STORM_WALL_RADIUS * scale;

    this.root.innerHTML = `
      <div class="map-panel">
        <div class="panel-header">
          <h2>Archipelago Chart</h2>
          <button class="close-btn">Close [M]</button>
        </div>
        <div class="map-canvas" style="width:${display}px;height:${display}px">
          <div class="map-grid"></div>
          <div class="map-storm" style="width:${stormR * 2}px;height:${stormR * 2}px"></div>
          ${lanes}
          ${locations}
          <div class="map-player" style="left:${px}px;top:${py}px;transform:translate(-50%,-50%) rotate(${headingDeg}deg)">
            <div class="map-player-arrow"></div>
          </div>
        </div>
        <div class="map-legend">
          <span><i style="background:${RISK_COLOR.safe}"></i>Safe</span>
          <span><i style="background:${RISK_COLOR.low}"></i>Low risk</span>
          <span><i style="background:${RISK_COLOR.medium}"></i>Medium</span>
          <span><i style="background:${RISK_COLOR.high}"></i>High risk</span>
          <span><i style="background:#9fe0ff"></i>Sea lane</span>
          <span><i style="background:#6644aa"></i>Storm wall</span>
        </div>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.hide());
  }
}
