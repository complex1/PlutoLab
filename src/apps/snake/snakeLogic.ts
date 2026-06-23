import type { SnakeConfig } from "./snakeConfig";

export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "ready" | "playing" | "paused" | "over";

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point;
  score: number;
  status: GameStatus;
  lastTick: number;
}

export function createGame(config: SnakeConfig): SnakeState {
  const grid = config.gridSize;
  const snake: Point[] = [];
  const startX = Math.floor(grid / 2);
  const startY = Math.floor(grid / 2);

  for (let i = 0; i < config.initialLength; i++) {
    snake.push({ x: startX - i, y: startY });
  }

  return {
    snake,
    direction: "right",
    nextDirection: "right",
    food: spawnFood(snake, grid),
    score: 0,
    status: "ready",
    lastTick: 0,
  };
}

export function startGame(config: SnakeConfig): SnakeState {
  const game = createGame(config);
  return { ...game, status: "playing", lastTick: performance.now() };
}

function spawnFood(snake: Point[], grid: number): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const empty: Point[] = [];

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function setDirection(state: SnakeState, dir: Direction): SnakeState {
  if (state.status !== "playing") return state;
  if (dir === OPPOSITE[state.direction]) return state;
  return { ...state, nextDirection: dir };
}

export function togglePause(state: SnakeState): SnakeState {
  if (state.status === "playing") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "playing", lastTick: performance.now() };
  return state;
}

export function getTickInterval(score: number, config: SnakeConfig): number {
  return Math.max(config.minSpeed, config.baseSpeed - score * config.speedRamp);
}

export function tick(state: SnakeState, config: SnakeConfig): SnakeState {
  if (state.status !== "playing") return state;

  const grid = config.gridSize;
  const direction = state.nextDirection;
  const head = state.snake[0];
  const nextHead = movePoint(head, direction);

  if (isCollision(nextHead, state.snake, grid)) {
    return { ...state, direction, status: "over" };
  }

  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
  const snake = [nextHead, ...state.snake];
  if (!ateFood) snake.pop();

  if (ateFood) {
    return {
      ...state,
      snake,
      direction,
      food: spawnFood(snake, grid),
      score: state.score + 1,
    };
  }

  return { ...state, snake, direction };
}

function movePoint(point: Point, direction: Direction): Point {
  switch (direction) {
    case "up":
      return { x: point.x, y: point.y - 1 };
    case "down":
      return { x: point.x, y: point.y + 1 };
    case "left":
      return { x: point.x - 1, y: point.y };
    case "right":
      return { x: point.x + 1, y: point.y };
  }
}

function isCollision(point: Point, snake: Point[], grid: number): boolean {
  if (point.x < 0 || point.x >= grid || point.y < 0 || point.y >= grid) {
    return true;
  }
  return snake.some((segment) => segment.x === point.x && segment.y === point.y);
}

import { idbGetNumber, idbSet } from "../../storage/indexedDb";

const BEST_SCORE_KEY = "snake:best";

export async function loadBestScore(): Promise<number> {
  return idbGetNumber(BEST_SCORE_KEY, 0);
}

export async function saveBestScore(score: number): Promise<void> {
  await idbSet(BEST_SCORE_KEY, score);
}
