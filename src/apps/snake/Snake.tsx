import { useCallback, useEffect, useRef, useState } from "react";
import GameConfigPanel from "./GameConfigPanel";
import {
  clampConfig,
  DEFAULT_CONFIG,
  getCellSize,
  loadConfig,
  saveConfig,
  type SnakeConfig,
} from "./snakeConfig";
import {
  createGame,
  getTickInterval,
  loadBestScore,
  saveBestScore,
  setDirection,
  startGame,
  tick,
  togglePause,
  type Direction,
  type SnakeState,
} from "./snakeLogic";
import "./Snake.css";

const PADDING = 8;

const SNAKE_COLOR = "#6bb87a";
const SNAKE_HEAD = "#8ed4a0";
const FOOD_COLOR = "#e07a8a";

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef<SnakeConfig>(DEFAULT_CONFIG);
  const gameRef = useRef<SnakeState>(createGame(DEFAULT_CONFIG));
  const rafRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<SnakeState["status"]>("ready");
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<SnakeConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void Promise.all([loadConfig(), loadBestScore()]).then(([cfg, bestScore]) => {
      configRef.current = cfg;
      gameRef.current = createGame(cfg);
      setConfig(cfg);
      setBest(bestScore);
    });
  }, []);

  const syncUi = useCallback((state: SnakeState) => {
    setScore(state.score);
    setStatus(state.status);
    if (state.status === "over") {
      setBest((prev) => {
        const next = Math.max(prev, state.score);
        void saveBestScore(next);
        return next;
      });
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const grid = configRef.current.gridSize;
    const cell = getCellSize(grid);
    const size = grid * cell + PADDING * 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: SnakeState) => {
    const dpr = window.devicePixelRatio || 1;
    const grid = configRef.current.gridSize;
    const cell = getCellSize(grid);
    const size = grid * cell + PADDING * 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i <= grid; i++) {
      const pos = PADDING + i * cell;
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + grid * cell, pos);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + grid * cell);
      ctx.stroke();
    }

    ctx.fillStyle = FOOD_COLOR;
    ctx.beginPath();
    ctx.arc(
      PADDING + state.food.x * cell + cell / 2,
      PADDING + state.food.y * cell + cell / 2,
      cell / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    state.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? SNAKE_HEAD : SNAKE_COLOR;
      ctx.fillRect(
        PADDING + segment.x * cell + 1,
        PADDING + segment.y * cell + 1,
        cell - 2,
        cell - 2
      );
    });
  }, []);

  const restartGame = useCallback(() => {
    gameRef.current = createGame(configRef.current);
    setScore(0);
    setStatus("ready");
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameRef.current;
    const cfg = configRef.current;

    if (state.status === "playing") {
      const now = performance.now();
      const interval = getTickInterval(state.score, cfg);
      if (now - state.lastTick >= interval) {
        gameRef.current = tick(state, cfg);
        gameRef.current.lastTick = now;
        syncUi(gameRef.current);
      }
    }

    draw(ctx, gameRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, syncUi]);

  const handleStart = () => {
    if (configOpen) return;
    if (gameRef.current.status === "ready" || gameRef.current.status === "over") {
      gameRef.current = startGame(configRef.current);
      syncUi(gameRef.current);
    }
  };

  const handleDirection = (dir: Direction) => {
    if (configOpen) return;
    gameRef.current = setDirection(gameRef.current, dir);
  };

  const handleSaveConfig = (next: SnakeConfig) => {
    const clamped = clampConfig(next);
    configRef.current = clamped;
    setConfig(clamped);
    void saveConfig(clamped);
    setConfigOpen(false);
    resizeCanvas();
    restartGame();
  };

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    resizeCanvas();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop, resizeCanvas]);

  useEffect(() => {
    const keyToDir: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
    };

    const onKey = (e: KeyboardEvent) => {
      if (configOpen) return;

      if (e.code === "Enter") {
        if (gameRef.current.status === "ready" || gameRef.current.status === "over") {
          handleStart();
        }
        return;
      }

      if (e.code === "KeyP") {
        e.preventDefault();
        gameRef.current = togglePause(gameRef.current);
        syncUi(gameRef.current);
        return;
      }

      const dir = keyToDir[e.code];
      if (dir) {
        e.preventDefault();
        if (gameRef.current.status === "ready" || gameRef.current.status === "over") return;
        handleDirection(dir);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [syncUi, configOpen]);

  return (
    <div className="snake">
      <div className="snake-toolbar">
        <button
          type="button"
          className="snake-settings-btn"
          onClick={() => setConfigOpen(true)}
          aria-label="Game settings"
        >
          ⚙ Settings
        </button>
      </div>

      <div className="snake-header">
        <div className="snake-stat">
          <span className="snake-stat-label">Score</span>
          <span className="snake-stat-value">{score}</span>
        </div>
        <div className="snake-stat">
          <span className="snake-stat-label">Best</span>
          <span className="snake-stat-value">{best}</span>
        </div>
      </div>

      <canvas ref={canvasRef} className="snake-board" aria-label="Snake game board" />

      {(status === "ready" || status === "over") && !configOpen && (
        <button type="button" className="snake-start" onClick={handleStart}>
          {status === "over" ? "Play again" : "Start game"}
        </button>
      )}

      {status === "paused" && <p className="snake-paused">Paused — press P</p>}

      <div className="snake-controls">
        <button type="button" className="snake-btn" onClick={() => handleDirection("up")} aria-label="Up">
          ↑
        </button>
        <div className="snake-controls-row">
          <button type="button" className="snake-btn" onClick={() => handleDirection("left")} aria-label="Left">
            ←
          </button>
          <button type="button" className="snake-btn" onClick={() => handleDirection("down")} aria-label="Down">
            ↓
          </button>
          <button type="button" className="snake-btn" onClick={() => handleDirection("right")} aria-label="Right">
            →
          </button>
        </div>
      </div>

      <p className="snake-hint">Arrows or WASD · P to pause</p>

      {configOpen && (
        <GameConfigPanel
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}
