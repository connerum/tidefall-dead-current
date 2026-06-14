export class DeathScreen {
  private root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "death-screen hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  show(killer?: string): void {
    this.root.classList.remove("hidden");
    this.root.innerHTML = `
      <div class="death-panel">
        <h1>YOU DIED</h1>
        <p>${killer ? `Killed by ${killer}` : "Lost to the Dead Current"}</p>
        <p>Your dropped backpack can be looted by others.</p>
        <p>Respawning at The Haven...</p>
      </div>
    `;
  }

  hide(): void {
    this.root.classList.add("hidden");
  }
}
