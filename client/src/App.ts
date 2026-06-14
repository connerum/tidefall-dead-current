import { GameClient } from "./game/GameClient.js";
import { NetworkClient } from "./game/NetworkClient.js";
import { MenuUI } from "./ui/menu.js";
import { Notifications } from "./ui/notifications.js";
import { HUD } from "./ui/hud.js";

export class App {
  private game?: GameClient;
  private net?: NetworkClient;
  private menu: MenuUI;
  private notifications: Notifications;
  private hud: HUD;

  constructor() {
    this.menu = new MenuUI((name) => this.connect(name));
    this.notifications = new Notifications();
    this.hud = new HUD();
  }

  start(): void {
    this.menu.show();
    this.notifications.show("Welcome to Tidefall: Dead Current", "info");
    this.hud.show();
  }

  private connect(name: string): void {
    const wsUrl = `ws://${window.location.hostname}:3001/ws`;
    this.net = new NetworkClient(wsUrl);
    this.game = new GameClient(this.net, this.notifications, this.hud);

    this.net.onOpen = () => {
      const storedId = localStorage.getItem("tidefall_playerId");
      this.net?.send({ type: "join", name, playerId: storedId || undefined });
    };

    this.net.onMessage = (msg) => {
      this.game?.handleMessage(msg);
    };

    this.net.onAuth = (playerId) => {
      localStorage.setItem("tidefall_playerId", playerId);
      this.menu.hide();
      this.game?.start();
    };

    this.net.connect();
  }
}
