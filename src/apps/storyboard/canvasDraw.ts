import type { DrawPoint, DrawStroke } from "./types";

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  const { tool, color, size, opacity, soft, points, endPoint, text } = stroke;

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,${opacity})`;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }

  ctx.globalAlpha = opacity;
  ctx.lineWidth = size;
  ctx.lineCap = soft ? "round" : "butt";
  ctx.lineJoin = "round";

  if (tool === "pencil" || tool === "brush" || tool === "eraser") {
    if (points.length === 0) return;
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, Math.max(size / 2, 1), 0, Math.PI * 2);
      if (tool === "eraser") ctx.fill();
      else ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  } else if (tool === "line" && points[0] && endPoint) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  } else if (tool === "rect" && points[0] && endPoint) {
    const x = Math.min(points[0].x, endPoint.x);
    const y = Math.min(points[0].y, endPoint.y);
    const w = Math.abs(endPoint.x - points[0].x);
    const h = Math.abs(endPoint.y - points[0].y);
    ctx.strokeRect(x, y, w, h);
  } else if (tool === "circle" && points[0] && endPoint) {
    const rx = Math.abs(endPoint.x - points[0].x) / 2;
    const ry = Math.abs(endPoint.y - points[0].y) / 2;
    const cx = (points[0].x + endPoint.x) / 2;
    const cy = (points[0].y + endPoint.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tool === "arrow" && points[0] && endPoint) {
    drawArrow(ctx, points[0], endPoint, size);
  } else if (tool === "text" && points[0] && text) {
    ctx.font = `${size * 4}px sans-serif`;
    ctx.fillText(text, points[0].x, points[0].y);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: DrawPoint,
  to: DrawPoint,
  size: number
) {
  const head = size * 3;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

export function renderPanelCanvas(
  canvas: HTMLCanvasElement,
  strokes: DrawStroke[],
  backgroundImage: string | null,
  width: number,
  height: number
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve();

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const drawAll = () => {
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
  };

  if (backgroundImage) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        drawAll();
        resolve();
      };
      img.onerror = () => {
        drawAll();
        resolve();
      };
      img.src = backgroundImage;
    });
  }

  drawAll();
  return Promise.resolve();
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, maxW?: number): string {
  if (!maxW || canvas.width <= maxW) {
    return canvas.toDataURL("image/png");
  }
  const scale = maxW / canvas.width;
  const thumb = document.createElement("canvas");
  thumb.width = maxW;
  thumb.height = Math.round(canvas.height * scale);
  const ctx = thumb.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/png");
}
