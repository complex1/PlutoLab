import { MAX_HISTORY } from "./constants";
import { getPathBounds } from "./pathTools";
import type { BezierPoint, BrushSettings, BrushTextureId, DraftShape, EditorState, LayerStyle, MarqueeState, PathKind, PenDraft, VectorLayer, VectorProject } from "./types";
import { mergeLayers } from "./layerOps";
import { DEFAULT_STYLE, createId } from "./types";

export type VectorAction =
  | { type: "NEW_PROJECT"; project: VectorProject }
  | { type: "OPEN_PROJECT"; project: VectorProject }
  | { type: "CLOSE_PROJECT" }
  | { type: "SET_TOOL"; tool: EditorState["tool"] }
  | { type: "SET_STYLE"; patch: Partial<LayerStyle> }
  | { type: "SELECT_LAYERS"; ids: string[] }
  | { type: "TOGGLE_LAYER_SELECT"; id: string; multi: boolean }
  | { type: "ADD_LAYER"; layer: VectorLayer }
  | { type: "UPDATE_LAYER"; id: string; patch: Partial<VectorLayer> }
  | { type: "SET_LAYERS"; layers: VectorLayer[] }
  | { type: "DELETE_LAYERS"; ids: string[] }
  | { type: "DUPLICATE_LAYERS"; ids: string[] }
  | { type: "REORDER_LAYER"; id: string; direction: "up" | "down" | "front" | "back" }
  | { type: "RENAME_LAYER"; id: string; name: string }
  | { type: "GROUP_LAYERS"; ids: string[] }
  | { type: "UNGROUP_LAYERS"; groupId: string }
  | { type: "MERGE_LAYERS"; ids: string[] }
  | { type: "SET_BRUSH"; patch: Partial<BrushSettings> }
  | { type: "SET_MARQUEE"; marquee: MarqueeState | null }
  | { type: "SET_PATH_EDIT"; index: number | null; handle: EditorState["pathEditHandle"] }
  | { type: "SET_VIEWPORT"; patch: Partial<EditorState["viewport"]> }
  | { type: "SET_DRAFT_SHAPE"; draft: DraftShape | null }
  | { type: "SET_PEN_DRAFT"; draft: PenDraft | null }
  | { type: "SET_ACTIVE_PATH"; id: string | null }
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "SET_BACKGROUND"; color: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "COMMIT_HISTORY" };

export interface VectorStore {
  present: EditorState;
  past: EditorState[];
  future: EditorState[];
}

function cloneState(state: EditorState): EditorState {
  return JSON.parse(JSON.stringify(state)) as EditorState;
}

export function createProject(name: string, width: number, height: number): VectorProject {
  return {
    id: createId(),
    name,
    canvasWidth: width,
    canvasHeight: height,
    background: "#1a1a1a",
    layers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createInitialState(project?: VectorProject | null): EditorState {
  return {
    project: project ?? null,
    tool: "select",
    selectedLayerIds: [],
    viewport: {
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: true,
      snapToGrid: false,
      gridSize: 20,
    },
    draftShape: null,
    penDraft: null,
    activePathId: null,
    pathEditIndex: null,
    pathEditHandle: null,
    marquee: null,
    brush: { size: 8, opacity: 100, smoothing: 3, texture: "none", textureIntensity: 50 },
    style: { ...DEFAULT_STYLE },
  };
}

export function createStore(project?: VectorProject | null): VectorStore {
  return { present: createInitialState(project), past: [], future: [] };
}

function updateLayer(project: VectorProject, id: string, patch: Partial<VectorLayer>): VectorProject {
  return {
    ...project,
    updatedAt: Date.now(),
    layers: project.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as VectorLayer) : l)),
  };
}

function reducer(state: EditorState, action: VectorAction): EditorState {
  switch (action.type) {
    case "NEW_PROJECT":
    case "OPEN_PROJECT":
      return {
        ...createInitialState(action.project),
        project: action.project,
      };
    case "CLOSE_PROJECT":
      return createInitialState(null);
    case "SET_TOOL":
      return { ...state, tool: action.tool, draftShape: null };
    case "SET_STYLE":
      return { ...state, style: { ...state.style, ...action.patch } };
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
    case "ADD_LAYER":
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: [...state.project.layers, action.layer],
        },
        selectedLayerIds: [action.layer.id],
      };
    case "UPDATE_LAYER":
      if (!state.project) return state;
      return { ...state, project: updateLayer(state.project, action.id, action.patch) };
    case "SET_LAYERS":
      if (!state.project) return state;
      return { ...state, project: { ...state.project, layers: action.layers, updatedAt: Date.now() } };
    case "DELETE_LAYERS": {
      if (!state.project) return state;
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
      if (!state.project) return state;
      const copies = state.project.layers
        .filter((l) => action.ids.includes(l.id))
        .map((l) => ({
          ...JSON.parse(JSON.stringify(l)),
          id: createId(),
          name: `${l.name} copy`,
          x: l.x + 16,
          y: l.y + 16,
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
    case "REORDER_LAYER": {
      if (!state.project) return state;
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
    case "RENAME_LAYER":
      if (!state.project) return state;
      return { ...state, project: updateLayer(state.project, action.id, { name: action.name }) };
    case "GROUP_LAYERS": {
      if (!state.project) return state;
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
      if (!state.project) return state;
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
    case "MERGE_LAYERS": {
      if (!state.project || action.ids.length < 2) return state;
      const toMerge = state.project.layers.filter((l) => action.ids.includes(l.id));
      const merged = mergeLayers(toMerge, state.style);
      if (!merged) return state;
      const remove = new Set(action.ids);
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          layers: [...state.project.layers.filter((l) => !remove.has(l.id)), merged],
        },
        selectedLayerIds: [merged.id],
      };
    }
    case "SET_BRUSH":
      return { ...state, brush: { ...state.brush, ...action.patch } };
    case "SET_MARQUEE":
      return { ...state, marquee: action.marquee };
    case "SET_PATH_EDIT":
      return { ...state, pathEditIndex: action.index, pathEditHandle: action.handle };
    case "SET_VIEWPORT":
      return { ...state, viewport: { ...state.viewport, ...action.patch } };
    case "SET_DRAFT_SHAPE":
      return { ...state, draftShape: action.draft };
    case "SET_PEN_DRAFT":
      return { ...state, penDraft: action.draft };
    case "SET_ACTIVE_PATH":
      return { ...state, activePathId: action.id };
    case "SET_PROJECT_NAME":
      if (!state.project) return state;
      return {
        ...state,
        project: { ...state.project, name: action.name, updatedAt: Date.now() },
      };
    case "SET_BACKGROUND":
      if (!state.project) return state;
      return {
        ...state,
        project: { ...state.project, background: action.color, updatedAt: Date.now() },
      };
    default:
      return state;
  }
}

export function dispatch(store: VectorStore, action: VectorAction): VectorStore {
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

export function createShapeLayer(
  type: "rect" | "ellipse" | "line",
  x: number,
  y: number,
  width: number,
  height: number,
  style: LayerStyle,
  x2?: number,
  y2?: number
): VectorLayer {
  const base = {
    id: createId(),
    name: type.charAt(0).toUpperCase() + type.slice(1),
    visible: true,
    locked: false,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 100,
    style: { ...style },
    groupId: null,
  };
  if (type === "line") {
    return { ...base, type: "line", x2: x2 ?? x + width, y2: y2 ?? y + height };
  }
  return { ...base, type };
}

export function createPathLayer(
  points: BezierPoint[],
  closed: boolean,
  pathKind: PathKind,
  style: LayerStyle,
  brushMeta?: { texture: BrushTextureId; textureIntensity: number }
): VectorLayer {
  const bounds = getPathBounds(points);
  return {
    id: createId(),
    name: pathKind === "pen" ? "Path" : pathKind === "pencil" ? "Pencil" : "Brush",
    type: "path",
    visible: true,
    locked: false,
    x: bounds?.x ?? 0,
    y: bounds?.y ?? 0,
    width: bounds?.width ?? 0,
    height: bounds?.height ?? 0,
    rotation: 0,
    opacity: 100,
    style: { ...style },
    points,
    closed,
    pathKind,
    ...(pathKind === "brush" && brushMeta
      ? { brushTexture: brushMeta.texture, textureIntensity: brushMeta.textureIntensity }
      : {}),
    groupId: null,
  };
}
