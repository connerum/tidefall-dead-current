export function createNoiseCanvas(size: number, colorFn: (x: number, y: number) => string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = colorFn(x / size, y / size);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function createSandTexture(size = 256): HTMLCanvasElement {
  return createNoiseCanvas(size, (u, v) => {
    const n = Math.random();
    const base = 210 + n * 25;
    return `rgb(${base}, ${base - 20}, ${base - 50})`;
  });
}

export function createGrassTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3a5a2a";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 80 + Math.random() * 60;
    ctx.strokeStyle = `rgb(${g - 30}, ${g}, ${g - 40})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y + 3 + Math.random() * 4);
    ctx.stroke();
  }
  return canvas;
}

export function createRockTexture(size = 256): HTMLCanvasElement {
  return createNoiseCanvas(size, () => {
    const n = Math.random();
    const v = 80 + n * 60;
    return `rgb(${v}, ${v - 10}, ${v - 15})`;
  });
}

export function createWeatheredWoodTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#5c4a36";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 12) {
    ctx.fillStyle = `rgba(40,30,20,${0.1 + Math.random() * 0.2})`;
    ctx.fillRect(0, y, size, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = "rgba(30,20,10,0.3)";
    ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 20, 2);
  }
  return canvas;
}

export function createRustedMetalTexture(size = 256): HTMLCanvasElement {
  return createNoiseCanvas(size, () => {
    const n = Math.random();
    if (n > 0.7) {
      const r = 120 + Math.random() * 60;
      return `rgb(${r}, ${r * 0.5}, ${r * 0.2})`;
    }
    const v = 40 + Math.random() * 30;
    return `rgb(${v}, ${v}, ${v + 5})`;
  });
}

export function createCanvasClothTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c4b89a";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(100,90,70,0.2)";
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  return canvas;
}

export function createConcreteTexture(size = 256): HTMLCanvasElement {
  return createNoiseCanvas(size, () => {
    const v = 100 + Math.random() * 40;
    return `rgb(${v}, ${v}, ${v + 5})`;
  });
}

export function createGunmetalTexture(size = 256): HTMLCanvasElement {
  return createNoiseCanvas(size, () => {
    const v = 50 + Math.random() * 30;
    return `rgb(${v}, ${v}, ${v + 2})`;
  });
}

export function createScrapPaintTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4a5a6a";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(${80 + Math.random() * 60}, ${40 + Math.random() * 40}, 20, 0.5)`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export function createCrateTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6b5035";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.fillStyle = "#2a1a0a";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText("SUPPLY", 30, size / 2);
  return canvas;
}

export function createWaterNormalTexture(size = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  return canvas;
}
