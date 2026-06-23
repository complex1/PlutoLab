import { useCallback, useEffect, useRef, useState } from "react";
import GameConfigPanel from "./GameConfigPanel";
import {
  clampConfig,
  DEFAULT_CONFIG,
  loadConfig,
  loadBestScore,
  saveConfig,
  saveBestScore,
  type FlappyConfig,
} from "./flappyConfig";
import "./FlappyBird.css";

type GameStatus = "ready" | "playing" | "over";

interface Bird {
  x: number;
  y: number;
  vy: number;
  rotation: number;
}

interface Pipe {
  x: number;
  top: number;
  scored: boolean;
}

interface GameState {
  bird: Bird;
  pipes: Pipe[];
  score: number;
  status: GameStatus;
  frame: number;
}

const PIPE_WIDTH = 52;
const BIRD_X = 72;
const BIRD_R = 13;

const COLORS = {
  sky: "#141414",
  pipe: "#2a2a2a",
  pipeEdge: "#6bb87a",
  bird: "#e07a8a",
  birdEye: "#f0f0f0",
  ground: "#1f1f1f",
  groundLine: "#3a3a3a",
};

function randomPipeTop(
  canvasHeight: number,
  groundHeight: number,
  pipeGap: number
) {
  const minTop = 48;
  const maxTop = canvasHeight - groundHeight - pipeGap - 48;
  return minTop + Math.random() * (maxTop - minTop);
}

function createPipe(
  canvasWidth: number,
  canvasHeight: number,
  groundHeight: number,
  config: FlappyConfig
): Pipe {
  return {
    x: canvasWidth + PIPE_WIDTH,
    top: randomPipeTop(canvasHeight, groundHeight, config.pipeGap),
    scored: false,
  };
}

function resetGame(
  canvasWidth: number,
  canvasHeight: number,
  groundHeight: number,
  config: FlappyConfig
): GameState {
  return {
    bird: { x: BIRD_X, y: canvasHeight / 2 - groundHeight / 2, vy: 0, rotation: 0 },
    pipes: [createPipe(canvasWidth, canvasHeight, groundHeight, config)],
    score: 0,
    status: "ready",
    frame: 0,
  };
}

function circleRectCollision(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const configRef = useRef<FlappyConfig>(DEFAULT_CONFIG);
  const rafRef = useRef<number>(0);
  const dimsRef = useRef({ width: 320, height: 480, ground: 56, dpr: 1 });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<FlappyConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void Promise.all([loadConfig(), loadBestScore()]).then(([cfg, bestScore]) => {
      configRef.current = cfg;
      setConfig(cfg);
      setBest(bestScore);
    });
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const { width, height, ground, dpr } = dimsRef.current;
    const { pipeGap } = configRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, width, height);

    for (const pipe of state.pipes) {
      const bottomY = pipe.top + pipeGap;
      const bottomH = height - ground - bottomY;

      ctx.fillStyle = COLORS.pipe;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomH);

      ctx.fillStyle = COLORS.pipeEdge;
      ctx.fillRect(pipe.x, pipe.top - 4, PIPE_WIDTH, 4);
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, 4);
    }

    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, height - ground, width, ground);
    ctx.fillStyle = COLORS.groundLine;
    ctx.fillRect(0, height - ground, width, 2);

    const { bird } = state;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.birdEye;
    ctx.beginPath();
    ctx.arc(5, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (state.status !== "ready") {
      ctx.fillStyle = "#f0f0f0";
      ctx.font = "700 28px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(state.score), width / 2, 52);
    }
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, ground } = dimsRef.current;
    const cfg = configRef.current;

    if (state.status === "playing") {
      state.frame += 1;
      state.bird.vy = Math.min(state.bird.vy + cfg.gravity, cfg.maxFallSpeed);
      state.bird.y += state.bird.vy;
      state.bird.rotation = Math.min(Math.max(state.bird.vy * 0.04, -0.35), 0.55);

      if (state.frame % cfg.pipeInterval === 0) {
        state.pipes.push(createPipe(width, height, ground, cfg));
      }

      for (const pipe of state.pipes) {
        pipe.x -= cfg.pipeSpeed;

        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.scored = true;
          state.score += 1;
          setScore(state.score);
        }

        const hitTop = circleRectCollision(
          state.bird.x,
          state.bird.y,
          BIRD_R,
          pipe.x,
          0,
          PIPE_WIDTH,
          pipe.top
        );
        const hitBottom = circleRectCollision(
          state.bird.x,
          state.bird.y,
          BIRD_R,
          pipe.x,
          pipe.top + cfg.pipeGap,
          PIPE_WIDTH,
          height - ground - (pipe.top + cfg.pipeGap)
        );

        if (hitTop || hitBottom) {
          state.status = "over";
          setStatus("over");
          setBest((prev) => {
            const next = Math.max(prev, state.score);
            void saveBestScore(next);
            return next;
          });
        }
      }

      state.pipes = state.pipes.filter((p) => p.x + PIPE_WIDTH > -20);

      if (state.bird.y + BIRD_R >= height - ground || state.bird.y - BIRD_R <= 0) {
        state.status = "over";
        setStatus("over");
        setBest((prev) => {
          const next = Math.max(prev, state.score);
          void saveBestScore(next);
          return next;
        });
      }
    }

    if (state.status === "ready") {
      state.bird.y = height / 2 - ground / 2 + Math.sin(state.frame * 0.04) * 4;
      state.frame += 1;
    }

    draw(ctx, state);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const restartGame = useCallback(() => {
    const { width, height, ground } = dimsRef.current;
    gameRef.current = resetGame(width, height, ground, configRef.current);
    setScore(0);
    setStatus("ready");
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.min(container.clientWidth, 360);
    const height = Math.round(width * 1.5);
    const ground = 56;
    const dpr = window.devicePixelRatio || 1;

    dimsRef.current = { width, height, ground, dpr };
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    restartGame();
  }, [restartGame]);

  const flap = useCallback(() => {
    if (configOpen) return;

    const state = gameRef.current;
    if (!state) return;

    const flapVelocity = -configRef.current.flapStrength;

    if (state.status === "ready") {
      state.status = "playing";
      state.bird.vy = flapVelocity;
      setStatus("playing");
      return;
    }

    if (state.status === "playing") {
      state.bird.vy = flapVelocity;
      return;
    }

    if (state.status === "over") {
      const { width, height, ground } = dimsRef.current;
      gameRef.current = resetGame(width, height, ground, configRef.current);
      gameRef.current.status = "playing";
      gameRef.current.bird.vy = flapVelocity;
      setScore(0);
      setStatus("playing");
    }
  }, [configOpen]);

  const handleSaveConfig = (next: FlappyConfig) => {
    const clamped = clampConfig(next);
    configRef.current = clamped;
    setConfig(clamped);
    void saveConfig(clamped);
    setConfigOpen(false);
    restartGame();
  };

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    setupCanvas();
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [setupCanvas, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (configOpen) return;
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, configOpen]);

  return (
    <div ref={containerRef} className="flappy">
      <div className="flappy-toolbar">
        <button
          type="button"
          className="flappy-settings-btn"
          onClick={() => setConfigOpen(true)}
          aria-label="Game settings"
        >
          ⚙ Settings
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="flappy-canvas"
        onPointerDown={(e) => {
          if (configOpen) return;
          e.preventDefault();
          flap();
        }}
        aria-label="Flappy Bird game canvas"
      />

      {status === "ready" && !configOpen && (
        <div className="flappy-overlay">
          <p className="flappy-title">Tap to fly</p>
          <p className="flappy-hint">Space or click</p>
        </div>
      )}

      {status === "over" && !configOpen && (
        <div className="flappy-overlay">
          <p className="flappy-title">Game over</p>
          <p className="flappy-score">Score: {score}</p>
          <p className="flappy-hint">Best: {best} · Tap to retry</p>
        </div>
      )}

      <div className="flappy-meta">
        <span>Best: {best}</span>
      </div>

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
