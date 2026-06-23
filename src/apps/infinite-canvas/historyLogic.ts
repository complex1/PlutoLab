import type { CanvasElement } from "./canvasTypes";
import { cloneElement } from "./selectionLogic";

const MAX_HISTORY = 50;

export function snapshotElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.map(cloneElement);
}

export interface HistoryController {
  commit: (current: CanvasElement[]) => void;
  undo: (current: CanvasElement[]) => CanvasElement[] | null;
  redo: (current: CanvasElement[]) => CanvasElement[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export function createHistoryController(initial: CanvasElement[]): HistoryController {
  const past: CanvasElement[][] = [];
  const future: CanvasElement[][] = [];
  let lastCommitted = snapshotElements(initial);

  return {
    commit(current) {
      past.push(snapshotElements(lastCommitted));
      if (past.length > MAX_HISTORY) past.shift();
      future.length = 0;
      lastCommitted = snapshotElements(current);
    },
    undo(current) {
      if (past.length === 0) return null;
      future.push(snapshotElements(current));
      const prev = past.pop()!;
      lastCommitted = snapshotElements(prev);
      return prev;
    },
    redo(current) {
      if (future.length === 0) return null;
      past.push(snapshotElements(current));
      const next = future.pop()!;
      lastCommitted = snapshotElements(next);
      return next;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
