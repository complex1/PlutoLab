export const COLS = 10;
export const ROWS = 20;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type GameStatus = "ready" | "playing" | "paused" | "over";

export interface ActivePiece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

export interface TetrisState {
  board: number[][];
  current: ActivePiece | null;
  next: PieceType;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  lastDrop: number;
}

export const PIECE_INDEX: Record<PieceType, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

export const PIECE_COLORS: Record<number, string> = {
  0: "transparent",
  1: "#6b9fff",
  2: "#d4a853",
  3: "#9b8fd4",
  4: "#6bb87a",
  5: "#e07a8a",
  6: "#5b7fd4",
  7: "#d4925a",
};

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
  ],
  O: [
    [
      [2, 2],
      [2, 2],
    ],
  ],
  T: [
    [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0],
    ],
    [
      [0, 3, 0],
      [0, 3, 3],
      [0, 3, 0],
    ],
    [
      [0, 0, 0],
      [3, 3, 3],
      [0, 3, 0],
    ],
    [
      [0, 3, 0],
      [3, 3, 0],
      [0, 3, 0],
    ],
  ],
  S: [
    [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0],
    ],
    [
      [0, 4, 0],
      [0, 4, 4],
      [0, 0, 4],
    ],
  ],
  Z: [
    [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ],
    [
      [0, 0, 5],
      [0, 5, 5],
      [0, 5, 0],
    ],
  ],
  J: [
    [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0],
    ],
    [
      [0, 6, 6],
      [0, 6, 0],
      [0, 6, 0],
    ],
    [
      [0, 0, 0],
      [6, 6, 6],
      [0, 0, 6],
    ],
    [
      [0, 6, 0],
      [0, 6, 0],
      [6, 6, 0],
    ],
  ],
  L: [
    [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0],
    ],
    [
      [0, 7, 0],
      [0, 7, 0],
      [0, 7, 7],
    ],
    [
      [0, 0, 0],
      [7, 7, 7],
      [7, 0, 0],
    ],
    [
      [7, 7, 0],
      [0, 7, 0],
      [0, 7, 0],
    ],
  ],
};

const SPAWN_X: Record<PieceType, number> = {
  I: 3,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

const PIECE_BAG: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export function createEmptyBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece(): PieceType {
  return PIECE_BAG[Math.floor(Math.random() * PIECE_BAG.length)];
}

export function getDropInterval(level: number): number {
  return Math.max(120, 820 - (level - 1) * 65);
}

export function createGame(): TetrisState {
  const next = randomPiece();
  return {
    board: createEmptyBoard(),
    current: null,
    next,
    score: 0,
    lines: 0,
    level: 1,
    status: "ready",
    lastDrop: 0,
  };
}

export function getShape(piece: ActivePiece): number[][] {
  const rotations = SHAPES[piece.type];
  return rotations[piece.rotation % rotations.length];
}

export function isValidPosition(
  board: number[][],
  piece: ActivePiece,
  offsetX = 0,
  offsetY = 0
): boolean {
  const shape = getShape(piece);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;
      const x = piece.x + col + offsetX;
      const y = piece.y + row + offsetY;
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && board[y][x]) return false;
    }
  }
  return true;
}

export function spawnPiece(state: TetrisState): TetrisState {
  const type = state.next;
  const piece: ActivePiece = {
    type,
    rotation: 0,
    x: SPAWN_X[type],
    y: 0,
  };

  if (!isValidPosition(state.board, piece)) {
    return { ...state, current: piece, status: "over" };
  }

  return {
    ...state,
    current: piece,
    next: randomPiece(),
    status: "playing",
  };
}

export function movePiece(
  state: TetrisState,
  dx: number,
  dy: number
): TetrisState {
  if (!state.current || state.status !== "playing") return state;
  if (isValidPosition(state.board, state.current, dx, dy)) {
    return {
      ...state,
      current: { ...state.current, x: state.current.x + dx, y: state.current.y + dy },
    };
  }
  return state;
}

export function rotatePiece(state: TetrisState, direction: 1 | -1): TetrisState {
  if (!state.current || state.status !== "playing") return state;

  const rotations = SHAPES[state.current.type];
  const nextRotation =
    (state.current.rotation + direction + rotations.length) % rotations.length;
  const rotated = { ...state.current, rotation: nextRotation };

  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    const candidate = { ...rotated, x: rotated.x + kick };
    if (isValidPosition(state.board, candidate)) {
      return { ...state, current: candidate };
    }
  }

  return state;
}

function lockPiece(state: TetrisState): TetrisState {
  if (!state.current) return state;

  const board = state.board.map((row) => [...row]);
  const shape = getShape(state.current);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      const value = shape[row][col];
      if (!value) continue;
      const y = state.current.y + row;
      const x = state.current.x + col;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        board[y][x] = value;
      }
    }
  }

  return { ...state, board, current: null };
}

function clearLines(board: number[][]): { board: number[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  const emptyRows = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...emptyRows, ...remaining], cleared };
}

function scoreForLines(lines: number, level: number): number {
  const table = [0, 100, 300, 500, 800];
  return (table[lines] ?? 800) * level;
}

export function tickDown(state: TetrisState): TetrisState {
  if (!state.current || state.status !== "playing") return state;

  const moved = movePiece(state, 0, 1);
  if (moved.current && moved.current.y !== state.current.y) {
    return moved;
  }

  return settlePiece(state);
}

function settlePiece(state: TetrisState): TetrisState {
  let next = lockPiece(state);
  const { board, cleared } = clearLines(next.board);
  const lines = next.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const score = next.score + scoreForLines(cleared, next.level);

  next = { ...next, board, lines, level, score };
  return spawnPiece(next);
}

export function hardDrop(state: TetrisState): TetrisState {
  if (!state.current || state.status !== "playing") return state;

  let next = state;
  let distance = 0;
  while (isValidPosition(next.board, next.current!, 0, distance + 1)) {
    distance += 1;
  }

  if (distance > 0) {
    next = {
      ...next,
      current: { ...next.current!, y: next.current!.y + distance },
      score: next.score + distance * 2,
    };
  }

  return settlePiece(next);
}

export function startGame(): TetrisState {
  const fresh = {
    ...createGame(),
    status: "playing" as GameStatus,
    lastDrop: performance.now(),
  };
  return spawnPiece(fresh);
}

export function togglePause(state: TetrisState): TetrisState {
  if (state.status === "playing") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "playing", lastDrop: performance.now() };
  return state;
}

export function getGhostY(state: TetrisState): number | null {
  if (!state.current) return null;
  let drop = 0;
  while (isValidPosition(state.board, state.current, 0, drop + 1)) {
    drop += 1;
  }
  return state.current.y + drop;
}

import { idbGetNumber, idbSet } from "../../storage/indexedDb";

const BEST_SCORE_KEY = "tetris:best";

export async function loadBestScore(): Promise<number> {
  return idbGetNumber(BEST_SCORE_KEY, 0);
}

export async function saveBestScore(score: number): Promise<void> {
  await idbSet(BEST_SCORE_KEY, score);
}
