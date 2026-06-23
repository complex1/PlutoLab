import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLS,
  PIECE_COLORS,
  ROWS,
  createGame,
  getDropInterval,
  getGhostY,
  getShape,
  hardDrop,
  loadBestScore,
  movePiece,
  rotatePiece,
  saveBestScore,
  startGame,
  tickDown,
  togglePause,
  type TetrisState,
} from "./tetrisLogic";
import "./Tetris.css";

const CELL = 22;
const PADDING = 8;

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TetrisState>(createGame());
  const rafRef = useRef(0);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<TetrisState["status"]>("ready");
  const [nextPiece, setNextPiece] = useState<TetrisState["next"]>("T");

  useEffect(() => {
    void loadBestScore().then(setBest);
  }, []);

  const syncUi = useCallback((state: TetrisState) => {
    setScore(state.score);
    setLines(state.lines);
    setLevel(state.level);
    setStatus(state.status);
    setNextPiece(state.next);
    if (state.status === "over") {
      setBest((prev) => {
        const next = Math.max(prev, state.score);
        void saveBestScore(next);
        return next;
      });
    }
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: TetrisState) => {
    const dpr = window.devicePixelRatio || 1;
    const boardW = COLS * CELL + PADDING * 2;
    const boardH = ROWS * CELL + PADDING * 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boardW, boardH);

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, boardW, boardH);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let row = 0; row <= ROWS; row++) {
      const y = PADDING + row * CELL;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(PADDING + COLS * CELL, y);
      ctx.stroke();
    }
    for (let col = 0; col <= COLS; col++) {
      const x = PADDING + col * CELL;
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, PADDING + ROWS * CELL);
      ctx.stroke();
    }

    const drawCell = (x: number, y: number, value: number, alpha = 1) => {
      if (!value) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PIECE_COLORS[value];
      ctx.fillRect(PADDING + x * CELL + 1, PADDING + y * CELL + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 1;
    };

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        drawCell(col, row, state.board[row][col]);
      }
    }

    if (state.current) {
      const ghostY = getGhostY(state);
      const shape = getShape(state.current);
      if (ghostY !== null) {
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            const value = shape[row][col];
            if (!value) continue;
            drawCell(state.current.x + col, ghostY + row, value, 0.2);
          }
        }
      }

      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          const value = shape[row][col];
          if (!value) continue;
          drawCell(state.current.x + col, state.current.y + row, value);
        }
      }
    }
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (state.status === "playing" && state.current) {
      const now = performance.now();
      const interval = getDropInterval(state.level);
      if (now - state.lastDrop >= interval) {
        gameRef.current = tickDown(state);
        gameRef.current.lastDrop = now;
        syncUi(gameRef.current);
      }
    }

    draw(ctx, gameRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, syncUi]);

  const applyAction = useCallback(
    (updater: (s: TetrisState) => TetrisState) => {
      gameRef.current = updater(gameRef.current);
      syncUi(gameRef.current);
    },
    [syncUi]
  );

  const handleStart = () => {
    if (gameRef.current.status === "ready" || gameRef.current.status === "over") {
      gameRef.current = startGame();
      syncUi(gameRef.current);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = COLS * CELL + PADDING * 2;
    const h = ROWS * CELL + PADDING * 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = gameRef.current;

      if (e.code === "Enter") {
        if (state.status === "ready" || state.status === "over") handleStart();
        return;
      }

      if (state.status === "ready" || state.status === "over") return;

      if (e.code === "KeyP") {
        e.preventDefault();
        applyAction(togglePause);
        return;
      }

      if (state.status !== "playing") return;

      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          applyAction((s) => movePiece(s, -1, 0));
          break;
        case "ArrowRight":
          e.preventDefault();
          applyAction((s) => movePiece(s, 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          applyAction((s) => tickDown(s));
          break;
        case "ArrowUp":
        case "KeyX":
          e.preventDefault();
          applyAction((s) => rotatePiece(s, 1));
          break;
        case "KeyZ":
          e.preventDefault();
          applyAction((s) => rotatePiece(s, -1));
          break;
        case "Space":
          e.preventDefault();
          applyAction(hardDrop);
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyAction]);

  return (
    <div className="tetris">
      <div className="tetris-layout">
        <canvas ref={canvasRef} className="tetris-board" aria-label="Tetris board" />

        <aside className="tetris-panel">
          <div className="tetris-stat">
            <span className="tetris-stat-label">Score</span>
            <span className="tetris-stat-value">{score}</span>
          </div>
          <div className="tetris-stat">
            <span className="tetris-stat-label">Lines</span>
            <span className="tetris-stat-value">{lines}</span>
          </div>
          <div className="tetris-stat">
            <span className="tetris-stat-label">Level</span>
            <span className="tetris-stat-value">{level}</span>
          </div>
          <div className="tetris-stat">
            <span className="tetris-stat-label">Best</span>
            <span className="tetris-stat-value">{best}</span>
          </div>

          <div className="tetris-next">
            <span className="tetris-stat-label">Next</span>
            <NextPreview type={nextPiece} />
          </div>

          <div className="tetris-controls">
            <p>← → Move</p>
            <p>↑ X Rotate</p>
            <p>↓ Soft drop</p>
            <p>Space Hard drop</p>
            <p>P Pause</p>
          </div>

          {(status === "ready" || status === "over") && (
            <button type="button" className="tetris-start" onClick={handleStart}>
              {status === "over" ? "Play again" : "Start game"}
            </button>
          )}

          {status === "paused" && (
            <p className="tetris-paused">Paused — press P</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function NextPreview({ type }: { type: TetrisState["next"] }) {
  const shape = getShape({ type, rotation: 0, x: 0, y: 0 });
  const size = 16;

  return (
    <div
      className="tetris-next-grid"
      style={{
        gridTemplateColumns: `repeat(${shape[0].length}, ${size}px)`,
      }}
    >
      {shape.flat().map((cell, i) => (
        <div
          key={i}
          className="tetris-next-cell"
          style={{
            width: size,
            height: size,
            background: cell ? PIECE_COLORS[cell] : "transparent",
          }}
        />
      ))}
    </div>
  );
}
