import type { NetworkClient } from "../game/NetworkClient.js";

/**
 * In-game chat. Press T to focus the input (which releases the mouse),
 * type, and hit Enter to broadcast. Incoming messages appear in a fading
 * log. The log never captures pointer events; only the input field does,
 * so the canvas stays clickable when the chat is closed.
 */
export class ChatUI {
  private net: NetworkClient;
  private root: HTMLElement;
  private log: HTMLElement;
  private input: HTMLInputElement;
  private open = false;
  private hideTimer?: number;

  constructor(net: NetworkClient) {
    this.net = net;
    this.root = document.createElement("div");
    this.root.className = "chat";
    this.root.innerHTML = `<div class="chat-log"></div>`;
    this.log = this.root.querySelector(".chat-log") as HTMLElement;

    this.input = document.createElement("input");
    this.input.className = "chat-input";
    this.input.type = "text";
    this.input.maxLength = 200;
    this.input.placeholder = "Press T to chat, Enter to send";
    this.input.autocomplete = "off";
    this.root.appendChild(this.input);

    document.getElementById("ui-root")?.appendChild(this.root);

    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const text = this.input.value.trim();
        if (text) this.net.send({ type: "chat", text });
        this.input.value = "";
        this.close();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  open_(): void {
    this.open = true;
    this.input.focus();
    this.input.placeholder = "Message…";
    if (document.pointerLockElement) document.exitPointerLock();
  }

  close(): void {
    this.open = false;
    this.input.blur();
    this.input.placeholder = "Press T to chat, Enter to send";
  }

  toggle(): void {
    if (this.open) this.close();
    else this.open_();
  }

  addMessage(sender: string, text: string): void {
    const line = document.createElement("div");
    line.className = "chat-line";
    line.innerHTML = `<span class="chat-sender">${escapeHtml(sender)}:</span> <span class="chat-text">${escapeHtml(text)}</span>`;
    this.log.appendChild(line);
    // keep only the most recent messages
    while (this.log.childElementCount > 50) this.log.firstChild?.remove();
    this.log.classList.add("visible");
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.log.classList.remove("visible"), 8000);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
