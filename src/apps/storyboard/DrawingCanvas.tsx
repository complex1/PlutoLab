import { useCallback, useEffect, useRef } from "react";
import { canvasToDataUrl, drawStroke, renderPanelCanvas } from "./canvasDraw";
import { createId } from "./projectUtils";
import type { BrushSettings, DrawPoint, DrawStroke, DrawTool } from "./types";

interface DrawingCanvasProps {
  width: number;
  height: number;
  strokes: DrawStroke[];
  backgroundImage: string | null;
  tool: DrawTool;
  brush: BrushSettings;
  onStrokesChange: (strokes: DrawStroke[], imageData: string) => void;
  onStrokeStart: () => void;
}

export default function DrawingCanvas({
  width,
  height,
  strokes,
  backgroundImage,
  tool,
  brush,
  onStrokesChange,
  onStrokeStart,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(strokes);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);
  strokesRef.current = strokes;

  const paintFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await renderPanelCanvas(canvas, strokesRef.current, backgroundImage, width, height);
    const stroke = currentStrokeRef.current;
    if (stroke) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawStroke(ctx, stroke);
    }
  }, [backgroundImage, height, width]);

  useEffect(() => {
    if (!drawingRef.current) {
      paintFrame();
    }
  }, [paintFrame, strokes, backgroundImage]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): DrawPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const finishStroke = useCallback(
    (stroke: DrawStroke) => {
      const next = [...strokesRef.current, stroke];
      const canvas = canvasRef.current;
      if (canvas) {
        renderPanelCanvas(canvas, next, backgroundImage, width, height).then(() => {
          onStrokesChange(next, canvasToDataUrl(canvas, 480));
        });
      } else {
        onStrokesChange(next, "");
      }
      currentStrokeRef.current = null;
      drawingRef.current = false;
    },
    [backgroundImage, height, onStrokesChange, width]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "select") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onStrokeStart();
    const pt = getPoint(e);

    if (tool === "text") {
      const text = window.prompt("Label text:") ?? "";
      if (!text.trim()) return;
      finishStroke({
        id: createId("stroke"),
        tool: "text",
        color: brush.color,
        size: brush.size,
        opacity: brush.opacity,
        soft: brush.soft,
        points: [pt],
        text,
      });
      return;
    }

    drawingRef.current = true;
    currentStrokeRef.current = {
      id: createId("stroke"),
      tool,
      color: brush.color,
      size: brush.size,
      opacity: brush.opacity,
      soft: tool === "brush" || tool === "pencil" ? true : brush.soft,
      points: [pt],
      endPoint: ["line", "rect", "circle", "arrow"].includes(tool) ? pt : undefined,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const pt = getPoint(e);
    const isFreehand = tool === "pencil" || tool === "brush" || tool === "eraser";
    const stroke = currentStrokeRef.current;

    currentStrokeRef.current = isFreehand
      ? { ...stroke, points: [...stroke.points, pt] }
      : { ...stroke, endPoint: pt };

    paintFrame();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finishStroke(currentStrokeRef.current);
  };

  return (
    <canvas
      ref={canvasRef}
      className="sb-canvas"
      width={width}
      height={height}
      style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
