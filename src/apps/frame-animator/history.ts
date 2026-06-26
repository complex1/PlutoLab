import { MAX_UNDO } from "./constants";

export function createHistory() {
  const undoStack: string[] = [];
  const redoStack: string[] = [];

  return {
    push(snapshot: string) {
      undoStack.push(snapshot);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0;
    },
    undo(current: string): string | null {
      if (undoStack.length === 0) return null;
      redoStack.push(current);
      return undoStack.pop() ?? null;
    },
    redo(current: string): string | null {
      if (redoStack.length === 0) return null;
      undoStack.push(current);
      return redoStack.pop() ?? null;
    },
    canUndo() {
      return undoStack.length > 0;
    },
    canRedo() {
      return redoStack.length > 0;
    },
    reset(initial: string) {
      undoStack.length = 0;
      redoStack.length = 0;
      undoStack.push(initial);
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
  };
}

export type FrameHistory = ReturnType<typeof createHistory>;
