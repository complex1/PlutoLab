import type { ChromaSettings } from "./types";

export function applyChromaKey(
  imageData: ImageData,
  settings: ChromaSettings
): ImageData {
  const { data } = imageData;
  const target = hexToRgb(settings.color);
  const tol = settings.tolerance;
  const feather = Math.max(1, settings.feather);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = colorDistance(r, g, b, target.r, target.g, target.b);
    if (dist <= tol) {
      data[i + 3] = 0;
    } else if (dist <= tol + feather) {
      const alpha = ((dist - tol) / feather) * 255;
      data[i + 3] = Math.min(data[i + 3], alpha);
    }
  }

  return imageData;
}

export function applySolidBackgroundRemoval(
  imageData: ImageData,
  color: string,
  tolerance: number
): ImageData {
  return applyChromaKey(imageData, { color, tolerance, feather: 8 });
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function sharpenImageData(imageData: ImageData, amount: number): ImageData {
  if (amount <= 0) return imageData;
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const strength = amount / 100;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += copy[idx] * kernel[ki++];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.min(255, Math.max(0, copy[idx] + (sum - copy[idx]) * strength));
      }
    }
  }
  return imageData;
}

export function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  block = 12
) {
  const imageData = ctx.getImageData(x, y, w, h);
  const { data, width, height } = imageData;
  for (let by = 0; by < height; by += block) {
    for (let bx = 0; bx < width; bx += block) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let py = by; py < Math.min(by + block, height); py++) {
        for (let px = bx; px < Math.min(bx + block, width); px++) {
          const i = (py * width + px) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
          count++;
        }
      }
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count); a = Math.round(a / count);
      for (let py = by; py < Math.min(by + block, height); py++) {
        for (let px = bx; px < Math.min(bx + block, width); px++) {
          const i = (py * width + px) * 4;
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imageData, x, y);
}

export function extractDominantColor(imageData: ImageData): string {
  const { data } = imageData;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 128) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2];
    count++;
  }
  if (!count) return "#6b9fff";
  return `#${[r / count, g / count, b / count].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
