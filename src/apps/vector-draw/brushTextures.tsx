import type { ReactElement } from "react";
import type { BrushTextureId, PathLayer } from "./types";

export const BRUSH_TEXTURES: { id: BrushTextureId; label: string }[] = [
  { id: "none", label: "Solid" },
  { id: "grain", label: "Grain" },
  { id: "rough", label: "Rough" },
  { id: "chalk", label: "Chalk" },
  { id: "spray", label: "Spray" },
];

const FILTER_REGION = { x: "-50%", y: "-50%", width: "200%", height: "200%" };

export function brushTextureFilterId(layerId: string): string {
  return `vd-tex-${layerId}`;
}

function intensityScale(intensity: number, min: number, max: number): number {
  return min + (intensity / 100) * (max - min);
}

function filterInnerMarkup(texture: BrushTextureId, intensity: number): string {
  const t = Math.max(0, Math.min(100, intensity));

  switch (texture) {
    case "grain":
      return `<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed="4" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${intensityScale(t, 3, 14).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>`;
    case "rough":
      return `<feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="3" seed="7" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${intensityScale(t, 8, 32).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>`;
    case "chalk":
      return `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="11" result="noise"/>
        <feGaussianBlur in="noise" stdDeviation="${intensityScale(t, 0.4, 1.8).toFixed(2)}" result="soft"/>
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="${intensityScale(t, 5, 22).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>`;
    case "spray":
      return `<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="4" seed="19" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${intensityScale(t, 4, 18).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="23" result="speckle"/>
        <feColorMatrix in="speckle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${intensityScale(t, 6, 18).toFixed(1)} -${intensityScale(t, 3, 10).toFixed(1)}" result="speckleMask"/>
        <feComposite in="displaced" in2="speckleMask" operator="in"/>`;
    default:
      return "";
  }
}

function FilterPrimitives({ texture, intensity }: { texture: BrushTextureId; intensity: number }) {
  const t = Math.max(0, Math.min(100, intensity));

  switch (texture) {
    case "grain":
      return (
        <>
          <feTurbulence type="fractalNoise" baseFrequency={0.7} numOctaves={4} seed={4} result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={intensityScale(t, 3, 14)}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </>
      );
    case "rough":
      return (
        <>
          <feTurbulence type="turbulence" baseFrequency={0.05} numOctaves={3} seed={7} result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={intensityScale(t, 8, 32)}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </>
      );
    case "chalk":
      return (
        <>
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={4} seed={11} result="noise" />
          <feGaussianBlur in="noise" stdDeviation={intensityScale(t, 0.4, 1.8)} result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale={intensityScale(t, 5, 22)}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </>
      );
    case "spray":
      return (
        <>
          <feTurbulence type="fractalNoise" baseFrequency={0.55} numOctaves={4} seed={19} result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={intensityScale(t, 4, 18)}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feTurbulence type="fractalNoise" baseFrequency={1.6} numOctaves={1} seed={23} result="speckle" />
          <feColorMatrix
            in="speckle"
            type="matrix"
            values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${intensityScale(t, 6, 18)} -${intensityScale(t, 3, 10)}`}
            result="speckleMask"
          />
          <feComposite in="displaced" in2="speckleMask" operator="in" />
        </>
      );
    default:
      return null;
  }
}

export function brushTextureFilterMarkup(layer: PathLayer): string {
  if (layer.pathKind !== "brush" || !layer.brushTexture || layer.brushTexture === "none") return "";
  const id = brushTextureFilterId(layer.id);
  const intensity = layer.textureIntensity ?? 50;
  return `<filter id="${id}" x="${FILTER_REGION.x}" y="${FILTER_REGION.y}" width="${FILTER_REGION.width}" height="${FILTER_REGION.height}" color-interpolation-filters="sRGB">
    ${filterInnerMarkup(layer.brushTexture, intensity)}
  </filter>`;
}

export function collectTexturedBrushLayers(layers: PathLayer[]): PathLayer[] {
  return layers.filter((l) => l.pathKind === "brush" && l.brushTexture && l.brushTexture !== "none");
}

export function brushTextureFilterUrl(layer: PathLayer): string | undefined {
  if (layer.pathKind !== "brush" || !layer.brushTexture || layer.brushTexture === "none") return undefined;
  return `url(#${brushTextureFilterId(layer.id)})`;
}

export function BrushTextureDefs({ layers }: { layers: PathLayer[] }): ReactElement | null {
  const textured = collectTexturedBrushLayers(layers);
  if (!textured.length) return null;

  return (
    <defs>
      {textured.map((layer) => (
        <filter
          key={layer.id}
          id={brushTextureFilterId(layer.id)}
          x={FILTER_REGION.x}
          y={FILTER_REGION.y}
          width={FILTER_REGION.width}
          height={FILTER_REGION.height}
          colorInterpolationFilters="sRGB"
        >
          <FilterPrimitives texture={layer.brushTexture!} intensity={layer.textureIntensity ?? 50} />
        </filter>
      ))}
    </defs>
  );
}
