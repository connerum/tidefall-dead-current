export class AudioManager {
  private ctx?: AudioContext;
  private volume = 0.5;

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.1): void {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playGunshot(type: string): void {
    if (type.includes("pistol")) this.playTone(400, 0.15, "square", 0.08);
    else if (type.includes("smg")) this.playTone(500, 0.08, "sawtooth", 0.06);
    else if (type.includes("shotgun")) this.playTone(150, 0.25, "square", 0.12);
    else if (type.includes("rifle")) this.playTone(300, 0.18, "sawtooth", 0.1);
    else if (type.includes("marksman") || type.includes("bolt")) this.playTone(250, 0.25, "sawtooth", 0.12);
    else this.playTone(350, 0.15, "square", 0.08);
  }

  playHitmarker(): void {
    this.playTone(880, 0.05, "sine", 0.05);
  }

  playReload(): void {
    this.playTone(200, 0.1, "triangle", 0.04);
  }

  playLoot(): void {
    this.playTone(660, 0.1, "sine", 0.05);
  }

  playNotification(): void {
    this.playTone(520, 0.15, "sine", 0.05);
  }
}
