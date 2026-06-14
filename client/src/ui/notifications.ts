export class Notifications {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "notifications";
    document.getElementById("ui-root")?.appendChild(this.container);
  }

  show(message: string, kind: "info" | "success" | "warning" | "danger" = "info"): void {
    const el = document.createElement("div");
    el.className = `notification notification-${kind}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 500);
    }, 4000);
  }
}
