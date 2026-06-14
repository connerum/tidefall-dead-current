import { LOCATIONS, STORM_WALL_RADIUS, WORLD_SIZE } from "@tidefall/shared";

export class MapUI {
  private root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "map-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private render(): void {
    const scale = 0.2; // pixels per unit
    const width = WORLD_SIZE * scale;
    const height = WORLD_SIZE * scale;
    const locations = Object.values(LOCATIONS).map((loc) => {
      const x = width / 2 + loc.position.x * scale;
      const y = height / 2 + loc.position.z * scale;
      return `<div class="map-location" style="left:${x}px;top:${y}px" data-name="${loc.name}"><span>${loc.name}</span></div>`;
    }).join("");

    this.root.innerHTML = `
      <div class="map-panel" style="width:${width}px;height:${height}px">
        <h2>Dead Current Map</h2>
        <div class="map-storm" style="width:${STORM_WALL_RADIUS * 2 * scale}px;height:${STORM_WALL_RADIUS * 2 * scale}px"></div>
        ${locations}
        <div class="map-player"></div>
        <button class="close-btn">Close (M)</button>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.hide());
  }
}
