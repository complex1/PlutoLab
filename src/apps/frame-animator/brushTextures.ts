import type { BrushSettings } from "./types";
import type { Point } from "./canvasDraw";

function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgba(brush: BrushSettings, alphaScale = 1) {
  const rgb = hexToRgb(brush.color);
  const a = brush.opacity * alphaScale;
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : brush.color;
}

export function stampTexture(
  ctx: CanvasRenderingContext2D,
  brush: BrushSettings,
  point: Point,
  pressure = 1
) {
  const { texture, size, textureIntensity } = brush;
  const intensity = textureIntensity / 100;
  const fill = rgba(brush, pressure);

  switch (texture) {
    case "soft": {
      const r = size * 0.75;
      const g = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r);
      g.addColorStop(0, rgba(brush, pressure));
      g.addColorStop(1, rgba(brush, pressure * 0.05));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "grain": {
      const dots = Math.max(3, Math.round(size * intensity * 0.8));
      for (let i = 0; i < dots; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size * 0.45;
        const r = Math.random() * size * 0.12 + 0.4;
        ctx.fillStyle = rgba(brush, pressure * (0.35 + Math.random() * 0.65));
        ctx.beginPath();
        ctx.arc(point.x + Math.cos(angle) * dist, point.y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "spray": {
      const dots = Math.max(6, Math.round(size * intensity * 1.4));
      const radius = size * (0.5 + intensity * 0.5);
      for (let i = 0; i < dots; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const r = Math.random() * size * 0.1 + 0.3;
        ctx.fillStyle = rgba(brush, pressure * (0.2 + Math.random() * 0.5));
        ctx.beginPath();
        ctx.arc(point.x + Math.cos(angle) * dist, point.y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "chalk": {
      const dots = Math.max(4, Math.round(size * intensity));
      for (let i = 0; i < dots; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size * 0.55;
        const r = Math.random() * size * 0.18 + 0.5;
        ctx.fillStyle = rgba(brush, pressure * (0.25 + Math.random() * 0.45));
        ctx.beginPath();
        ctx.arc(point.x + Math.cos(angle) * dist, point.y + Math.sin(angle) * dist, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
  }
}

export function strokeAlongPath(
  ctx: CanvasRenderingContext2D,
  brush: BrushSettings,
  from: Point,
  to: Point,
  steps: number
) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampTexture(ctx, brush, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, 1);
  }
}
