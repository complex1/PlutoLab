import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./Sudoku.css";

gsap.registerPlugin(useGSAP);

type Grid = number[][];
type Cell = { value: number; fixed: boolean };

const SIZE = 9;

export default function Sudoku() {
  const [cells, setCells] = useState<Cell[]>(() => initPuzzle());
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [timer, setTimer] = useState(0);
  const [puzzleKey, setPuzzleKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useGSAP(
    () => {
      gsap.from(".sudoku-cell", {
        scale: 0.5,
        opacity: 0,
        duration: 0.3,
        stagger: 0.01,
        ease: "back.out(1.5)",
      });
    },
    { scope: containerRef, dependencies: [puzzleKey], revertOnUpdate: true }
  );

  useGSAP(
    () => {
      if (solved) return;
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    },
    { dependencies: [solved] }
  );

  const handleCellClick = (index: number) => {
    if (cells[index].fixed || solved) return;
    setSelected(index);
  };

  const handleNumber = useCallback(
    (num: number) => {
      if (selected === null || cells[selected].fixed || solved) return;

      const next = [...cells];
      const solution = getSolution(cells);
      const correct = solution[selected] === num;

      next[selected] = { value: num, fixed: false };
      setCells(next);

      if (!correct) {
        setMistakes((m) => m + 1);
        gsap.fromTo(
          `.sudoku-cell:nth-child(${selected + 1})`,
          { x: -4 },
          { x: 0, duration: 0.1, repeat: 3, ease: "power1.inOut" }
        );
      }

      if (isComplete(next, solution)) {
        setSolved(true);
        if (timerRef.current) clearInterval(timerRef.current);
        gsap.from(".sudoku-board", {
          scale: 1.02,
          duration: 0.3,
          repeat: 2,
          yoyo: true,
          ease: "power2.inOut",
        });
      }
    },
    [selected, cells, solved]
  );

  const clearCell = () => {
    if (selected === null || cells[selected].fixed) return;
    const next = [...cells];
    next[selected] = { value: 0, fixed: false };
    setCells(next);
  };

  const newGame = () => {
    setCells(initPuzzle());
    setSelected(null);
    setMistakes(0);
    setSolved(false);
    setTimer(0);
    setPuzzleKey((k) => k + 1);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const selectedRow = selected !== null ? Math.floor(selected / 9) : -1;
  const selectedCol = selected !== null ? selected % 9 : -1;
  const selectedBox =
    selected !== null
      ? Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)
      : -1;

  return (
    <div ref={containerRef} className="sudoku">
      <div className="sudoku-header">
        <span className="sudoku-timer">{formatTime(timer)}</span>
        <span className="sudoku-mistakes">Mistakes: {mistakes}/3</span>
      </div>

      {solved && <div className="sudoku-win">Solved!</div>}

      <div className="sudoku-board">
        {cells.map((cell, i) => {
          const row = Math.floor(i / 9);
          const col = i % 9;
          const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const isRelated =
            selected !== null &&
            (row === selectedRow ||
              col === selectedCol ||
              box === selectedBox);

          return (
            <button
              key={i}
              className={`sudoku-cell ${cell.fixed ? "fixed" : ""} ${
                selected === i ? "selected" : ""
              } ${isRelated && selected !== i ? "related" : ""} ${
                cell.value !== 0 && !cell.fixed && getSolution(cells)[i] !== cell.value
                  ? "wrong"
                  : ""
              }`}
              onClick={() => handleCellClick(i)}
            >
              {cell.value || ""}
            </button>
          );
        })}
      </div>

      <div className="sudoku-numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="sudoku-num" onClick={() => handleNumber(n)}>
            {n}
          </button>
        ))}
        <button className="sudoku-num clear" onClick={clearCell}>
          ✕
        </button>
      </div>

      <button className="sudoku-new" onClick={newGame}>
        New Puzzle
      </button>
    </div>
  );
}

function initPuzzle(): Cell[] {
  const full = generateFullGrid();
  const puzzle = removeCells(full, 45);
  return puzzle.flat().map((v) => ({ value: v, fixed: v !== 0 }));
}

function generateFullGrid(): Grid {
  const grid: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  fillGrid(grid);
  return grid;
}

function fillGrid(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== 0) continue;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (fillGrid(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function removeCells(grid: Grid, count: number): Grid {
  const result = grid.map((row) => [...row]);
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= count) break;
    result[r][c] = 0;
    removed++;
  }
  return result;
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getSolution(cells: Cell[]): number[] {
  const grid: Grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  cells.forEach((cell, i) => {
    grid[Math.floor(i / 9)][i % 9] = cell.fixed ? cell.value : 0;
  });
  solveGrid(grid);
  return grid.flat();
}

function solveGrid(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== 0) continue;
      for (let n = 1; n <= 9; n++) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (solveGrid(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function isComplete(cells: Cell[], solution: number[]): boolean {
  return cells.every((cell, i) => cell.value === solution[i]);
}
