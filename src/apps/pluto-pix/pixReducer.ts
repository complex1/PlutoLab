import { MAX_HISTORY } from "./constants";
import type { EditorState, PixLayer, PixProject } from "./types";
import { DEFAULT_ADJUSTMENTS, createId } from "./types";

export type PixAction =
  | { type: "SET_TOOL"; tool: EditorState["tool"] }
  | { type: "SET_PANEL"; panel: EditorState["activePanel"] }
  | { type: "SELECT_LAYERS"; ids: string[] }
  | { type: "TOGGLE_LAYER_SELECT"; id: string; multi: boolean }
  | { type: "SET_PROJECT"; project: PixProject }
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "UPDATE_LAYER"; id: string; patch: Partial<PixLayer> }
  | { type: "SET_LAYERS"; layers: PixLayer[] }
  | { type: "ADD_LAYER"; layer: PixLayer }
  | { type: "DELETE_LAYERS"; ids: string[] }
  | { type: "DUPLICATE_LAYERS"; ids: string[] }
  | { type: "REORDER_LAYER"; id: string; direction: "up" | "down" | "front" | "back" }
  | { type: "RENAME_LAYER"; id: string; name: string }
  | { type: "GROUP_LAYERS"; ids: string[] }
  | { type: "UNGROUP_LAYERS"; groupId: string }
  | { type: "SET_VIEWPORT"; patch: Partial<EditorState["viewport"]> }
  | { type: "SET_BRUSH"; patch: Partial<EditorState["brush"]> }
  | { type: "SET_CHROMA"; patch: Partial<EditorState["chroma"]> }
  | { type: "SET_WATERMARK_SETTINGS"; patch: Partial<EditorState["watermark"]> }
  | { type: "SET_CROP"; crop: EditorState["crop"] }
  | { type: "APPLY_CROP" }
  | { type: "SET_COMPARE"; compare: boolean; slider?: number }
  | { type: "ADD_RECENT_COLOR"; color: string }
  | { type: "ADD_PALETTE_COLOR"; color: string }
  | { type: "SET_THEME"; theme: EditorState["theme"] }
  | { type: "SET_FULLSCREEN"; fullscreen: boolean }
  | { type: "SET_EXPORT_SIZE"; width: number; height: number }
  | { type: "SET_BACKGROUND_GRADIENT"; gradient: import("./types").GradientFill | null }
  | { type: "ROTATE_SELECTED"; degrees: number }
  | { type: "FLIP_SELECTED"; axis: "h" | "v" }
  | { type: "RESET_TRANSFORM" }
  | { type: "SET_CANVAS_SIZE"; width: number; height: number }
  | { type: "SET_BACKGROUND"; color: string }
  | { type: "ADD_STROKE"; layerId: string; stroke: import("./types").BrushStroke }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "COMMIT_HISTORY" };

export interface PixStore {
  present: EditorState;
  past: EditorState[];
  future: EditorState[];
}

function cloneState(state: EditorState): EditorState {
  return JSON.parse(JSON.stringify(state)) as EditorState;
}

export function createDefaultProject(name = "Untitled"): PixProject {
  return {
    id: createId(),
    name,
    canvasWidth: 1080,
    canvasHeight: 1080,
    background: "#1a1a1a",
    layers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createInitialState(project?: PixProject): EditorState {
  return {
    project: project ?? createDefaultProject(),
    tool: "select",
    selectedLayerIds: [],
    viewport: {
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: false,
      showRulers: false,
      showCheckerboard: true,
      showBoundary: true,
      snapToGrid: false,
      gridSize: 20,
    },
    crop: null,
    brush: { kind: "brush", color: "#e8e8f0", size: 8, opacity: 100, soft: true, dashed: false },
    chroma: { color: "#00ff00", tolerance: 60, feather: 12 },
    watermark: { text: "PlutoPix", opacity: 40, size: 24, repeat: false },
    shapeKind: "rect",
    shapeFill: "rgba(107,159,255,0.3)",
    shapeStroke: "#6b9fff",
    shapeStrokeWidth: 2,
    activePanel: "layers",
    compareOriginal: false,
    compareSlider: 50,
    recentColors: ["#6b9fff", "#e07a8a", "#6bb87a", "#f0f0f0", "#000000"],
    customPalette: [],
    theme: "dark",
    fullscreen: false,
    exportWidth: project?.canvasWidth ?? 1080,
    exportHeight: project?.canvasHeight ?? 1080,
  };
}

export function createStore(project?: PixProject): PixStore {
  return { present: createInitialState(project), past: [], future: [] };
}

function updateLayer(
  project: PixProject,
  id: string,
  patch: Partial<PixLayer>
): PixProject {
  return {
    ...project,
    updatedAt: Date.now(),
    layers: project.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as PixLayer) : l)),
  };
}

function reducer(state: EditorState, action: PixAction): EditorState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, tool: action.tool };
    case "SET_PANEL":
      return { ...state, activePanel: action.panel };
    case "SELECT_LAYERS":
      return { ...state, selectedLayerIds: action.ids };
    case "TOGGLE_LAYER_SELECT": {
      if (action.multi) {
        const exists = state.selectedLayerIds.includes(action.id);
        return {
          ...state,
          selectedLayerIds: exists
            ? state.selectedLayerIds.filter((i) => i !== action.id)
            : [...state.selectedLayerIds, action.id],
        };
      }
      return { ...state, selectedLayerIds: [action.id] };
    }
    case "SET_PROJECT":
      return {
        ...state,
        project: action.project,
        selectedLayerIds: [],
        exportWidth: action.project.canvasWidth,
        exportHeight: action.project.canvasHeight,
      };
    case "SET_PROJECT_NAME":
      return {
        ...state,
        project: { ...state.project, name: action.name, updatedAt: Date.now() },
      };
    case "SET_LAYERS":
      return {
        ...state,
        project: { ...state.project, layers: action.layers, updatedAt: Date.now() },
      };
    case "UPDATE_LAYER":
      return {
        ...state,
        project: updateLayer(state.project, action.id, action.patch),
      };
    case "ADD_LAYER":
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: [...state.project.layers, action.layer],
        },
        selectedLayerIds: [action.layer.id],
      };
    case "DELETE_LAYERS": {
      const ids = new Set(action.ids);
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.filter((l) => !ids.has(l.id)),
        },
        selectedLayerIds: state.selectedLayerIds.filter((id) => !ids.has(id)),
      };
    }
    case "DUPLICATE_LAYERS": {
      const copies = state.project.layers
        .filter((l) => action.ids.includes(l.id))
        .map((l) => ({
          ...JSON.parse(JSON.stringify(l)),
          id: createId(),
          name: `${l.name} copy`,
          x: l.x + 20,
          y: l.y + 20,
        }));
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: [...state.project.layers, ...copies],
        },
        selectedLayerIds: copies.map((c) => c.id),
      };
    }
    case "RENAME_LAYER":
      return {
        ...state,
        project: updateLayer(state.project, action.id, { name: action.name }),
      };
    case "GROUP_LAYERS": {
      const groupId = createId();
      const ids = new Set(action.ids);
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) =>
            ids.has(l.id) ? { ...l, groupId } : l
          ),
        },
      };
    }
    case "UNGROUP_LAYERS":
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) =>
            l.groupId === action.groupId ? { ...l, groupId: null } : l
          ),
        },
      };
    case "REORDER_LAYER": {
      const layers = [...state.project.layers];
      const idx = layers.findIndex((l) => l.id === action.id);
      if (idx < 0) return state;
      const [item] = layers.splice(idx, 1);
      if (action.direction === "up") layers.splice(Math.min(layers.length, idx + 1), 0, item);
      else if (action.direction === "down") layers.splice(Math.max(0, idx - 1), 0, item);
      else if (action.direction === "front") layers.push(item);
      else layers.unshift(item);
      return { ...state, project: { ...state.project, layers, updatedAt: Date.now() } };
    }
    case "SET_VIEWPORT":
      return { ...state, viewport: { ...state.viewport, ...action.patch } };
    case "SET_BRUSH":
      return { ...state, brush: { ...state.brush, ...action.patch } };
    case "SET_CHROMA":
      return { ...state, chroma: { ...state.chroma, ...action.patch } };
    case "SET_WATERMARK_SETTINGS":
      return { ...state, watermark: { ...state.watermark, ...action.patch } };
    case "SET_THEME":
      return { ...state, theme: action.theme };
    case "SET_FULLSCREEN":
      return { ...state, fullscreen: action.fullscreen };
    case "SET_EXPORT_SIZE":
      return { ...state, exportWidth: action.width, exportHeight: action.height };
    case "SET_BACKGROUND_GRADIENT":
      return {
        ...state,
        project: { ...state.project, backgroundGradient: action.gradient, updatedAt: Date.now() },
      };
    case "ADD_PALETTE_COLOR": {
      const palette = [action.color, ...state.customPalette.filter((c) => c !== action.color)].slice(0, 16);
      return { ...state, customPalette: palette };
    }
    case "SET_CROP":
      return { ...state, crop: action.crop };
    case "APPLY_CROP": {
      if (!state.crop?.active) return state;
      const { x, y, width, height } = state.crop;
      return {
        ...state,
        crop: null,
        project: {
          ...state.project,
          canvasWidth: Math.round(width),
          canvasHeight: Math.round(height),
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) => ({
            ...l,
            x: l.x - x,
            y: l.y - y,
          })),
        },
      };
    }
    case "SET_COMPARE":
      return {
        ...state,
        compareOriginal: action.compare,
        compareSlider: action.slider ?? state.compareSlider,
      };
    case "ADD_RECENT_COLOR": {
      const colors = [action.color, ...state.recentColors.filter((c) => c !== action.color)].slice(0, 12);
      return { ...state, recentColors: colors };
    }
    case "ROTATE_SELECTED":
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) =>
            state.selectedLayerIds.includes(l.id)
              ? { ...l, rotation: l.rotation + action.degrees }
              : l
          ),
        },
      };
    case "FLIP_SELECTED":
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) =>
            state.selectedLayerIds.includes(l.id)
              ? action.axis === "h"
                ? { ...l, flipH: !l.flipH }
                : { ...l, flipV: !l.flipV }
              : l
          ),
        },
      };
    case "RESET_TRANSFORM":
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: state.project.layers.map((l) =>
            state.selectedLayerIds.includes(l.id)
              ? { ...l, rotation: 0, flipH: false, flipV: false }
              : l
          ),
        },
      };
    case "SET_CANVAS_SIZE":
      return {
        ...state,
        project: {
          ...state.project,
          canvasWidth: action.width,
          canvasHeight: action.height,
          updatedAt: Date.now(),
        },
      };
    case "SET_BACKGROUND":
      return {
        ...state,
        project: { ...state.project, background: action.color, updatedAt: Date.now() },
      };
    case "ADD_STROKE": {
      const layers = state.project.layers.map((l) => {
        if (l.id !== action.layerId || l.type !== "drawing") return l;
        return { ...l, strokes: [...l.strokes, action.stroke] };
      });
      return { ...state, project: { ...state.project, layers, updatedAt: Date.now() } };
    }
    default:
      return state;
  }
}

export function dispatch(store: PixStore, action: PixAction): PixStore {
  if (action.type === "UNDO") {
    if (store.past.length === 0) return store;
    const previous = store.past[store.past.length - 1];
    return {
      present: cloneState(previous),
      past: store.past.slice(0, -1),
      future: [cloneState(store.present), ...store.future],
    };
  }
  if (action.type === "REDO") {
    if (store.future.length === 0) return store;
    const next = store.future[0];
    return {
      present: cloneState(next),
      past: [...store.past, cloneState(store.present)],
      future: store.future.slice(1),
    };
  }

  const next = reducer(store.present, action);
  if (next === store.present) return store;

  if (action.type === "COMMIT_HISTORY") {
    const past = [...store.past, cloneState(store.present)];
    if (past.length > MAX_HISTORY) past.shift();
    return { present: next, past, future: [] };
  }

  return { ...store, present: next };
}

export function createImageLayer(
  src: string,
  width: number,
  height: number,
  name: string
): PixLayer {
  const scale = Math.min(1, 800 / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  return {
    id: createId(),
    name,
    type: "image",
    visible: true,
    locked: false,
    opacity: 100,
    x: 40,
    y: 40,
    width: w,
    height: h,
    rotation: 0,
    flipH: false,
    flipV: false,
    src,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: null,
  };
}

export function createEmptyImageLayer(project: PixProject, name = "Layer"): PixLayer {
  const canvas = document.createElement("canvas");
  canvas.width = project.canvasWidth;
  canvas.height = project.canvasHeight;
  return {
    id: createId(),
    name,
    type: "image",
    visible: true,
    locked: false,
    opacity: 100,
    x: 0,
    y: 0,
    width: project.canvasWidth,
    height: project.canvasHeight,
    rotation: 0,
    flipH: false,
    flipV: false,
    src: canvas.toDataURL("image/png"),
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filterId: null,
  };
}

export function createDrawingLayer(project: PixProject): PixLayer {
  return {
    id: createId(),
    name: "Drawing",
    type: "drawing",
    visible: true,
    locked: false,
    opacity: 100,
    x: 0,
    y: 0,
    width: project.canvasWidth,
    height: project.canvasHeight,
    rotation: 0,
    flipH: false,
    flipV: false,
    strokes: [],
  };
}
