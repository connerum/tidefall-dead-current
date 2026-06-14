import { decodeMessage, encodeMessage, type ClientMessage, type ServerMessage } from "@tidefall/shared";

export class NetworkClient {
  private ws?: WebSocket;
  private url: string;
  onOpen?: () => void;
  onMessage?: (msg: ServerMessage) => void;
  onAuth?: (playerId: string) => void;
  ping = 0;
  private pingInterval?: number;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.onOpen?.();
      this.startPing();
    };
    this.ws.onmessage = (ev) => {
      const msg = decodeMessage(ev.data) as ServerMessage | null;
      if (!msg) return;
      if (msg.type === "auth") this.onAuth?.(msg.playerId);
      this.onMessage?.(msg);
    };
    this.ws.onclose = () => {
      window.clearInterval(this.pingInterval);
      setTimeout(() => this.connect(), 2000);
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(encodeMessage(msg));
    }
  }

  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      this.send({ type: "ping", timestamp: Date.now() });
    }, 2000);
  }
}
