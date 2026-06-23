import { brushTextureFilterId, brushTextureFilterMarkup, collectTexturedBrushLayers } from "./brushTextures";
import { draftToSvgD, pathToSvgD } from "./pathTools";
import type { LayerStyle, PathLayer, VectorLayer, VectorProject } from "./types";

function styleAttrs(style: LayerStyle, opacity: number, skipCssFilter = false): Record<string, string | number> {
  const filter =
    !skipCssFilter && (style.blur > 0 || style.shadowBlur > 0)
      ? `drop-shadow(${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px rgba(0,0,0,${style.shadowOpacity / 100})) blur(${style.blur}px)`
      : undefined;
  return {
    fill: style.fill === "none" ? "none" : style.fill,
    "fill-opacity": (style.fillOpacity / 100) * (opacity / 100),
    stroke: style.stroke,
    "stroke-width": style.strokeWidth,
    "stroke-opacity": style.strokeOpacity / 100,
    ...(style.strokeDasharray ? { "stroke-dasharray": style.strokeDasharray } : {}),
    ...(filter ? { filter } : {}),
  };
}

function layerToSvg(layer: VectorLayer): string {
  const attrs = styleAttrs(layer.style, layer.opacity);
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  const transform =
    layer.rotation !== 0
      ? ` transform="rotate(${layer.rotation} ${layer.x + layer.width / 2} ${layer.y + layer.height / 2})"`
      : "";

  if (!layer.visible) return "";

  switch (layer.type) {
    case "rect":
      return `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.style.cornerRadius}" ${attrStr}${transform}/>`;
    case "ellipse":
      return `<ellipse cx="${layer.x + layer.width / 2}" cy="${layer.y + layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" ${attrStr}${transform}/>`;
    case "line":
      return `<line x1="${layer.x}" y1="${layer.y}" x2="${layer.x2}" y2="${layer.y2}" ${attrStr}${transform}/>`;
    case "path": {
      const d = pathToSvgD(layer);
      if (!d) return "";
      const hasTexture = layer.pathKind === "brush" && layer.brushTexture && layer.brushTexture !== "none";
      const pathAttrs = styleAttrs(layer.style, layer.opacity, hasTexture);
      const pathAttrStr = Object.entries(pathAttrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      const linecap = layer.pathKind === "brush" ? "round" : layer.pathKind === "pencil" ? "square" : "round";
      const textureFilter = hasTexture ? ` filter="url(#${brushTextureFilterId(layer.id)})"` : "";
      return `<path d="${d}" ${pathAttrStr} stroke-linecap="${linecap}" stroke-linejoin="round"${textureFilter}${transform}/>`;
    }
  }
}

export function projectToSvgString(project: VectorProject): string {
  const pathLayers = project.layers.filter((l): l is PathLayer => l.type === "path");
  const textureDefs = collectTexturedBrushLayers(pathLayers).map(brushTextureFilterMarkup).join("\n  ");
  const layers = project.layers.map(layerToSvg).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.canvasWidth}" height="${project.canvasHeight}" viewBox="0 0 ${project.canvasWidth} ${project.canvasHeight}">
  <rect width="100%" height="100%" fill="${project.background}"/>
  ${textureDefs ? `<defs>\n  ${textureDefs}\n  </defs>` : ""}
  ${layers}
</svg>`;
}

export function downloadSvg(project: VectorProject) {
  const svg = projectToSvgString(project);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function draftPathToElement(
  points: import("./types").BezierPoint[],
  closed: boolean,
  style: LayerStyle
): string {
  const d = draftToSvgD(points, closed);
  if (!d) return "";
  const attrs = styleAttrs(style, 100);
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<path d="${d}" ${attrStr} fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
