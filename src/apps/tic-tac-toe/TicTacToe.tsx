import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./TicTacToe.css";

gsap.registerPlugin(useGSAP);

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[];

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [gameKey, setGameKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const winningLine = winner && winner !== "draw" ? findWinningLine(board) : null;

  useGSAP(
    () => {
      gsap.from(".ttt-cell", {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: "back.out(2)",
      });
    },
    { scope: containerRef, dependencies: [gameKey], revertOnUpdate: true }
  );

  const handleClick = useCallback(
    (index: number) => {
      if (board[index] || winner) return;

      const next = [...board];
      next[index] = current;
      const win = checkWinner(next);

      setBoard(next);

      if (win) {
        setWinner(win);
        setScores((s) => ({ ...s, [win]: s[win] + 1 }));
        animateWin(index);
      } else if (next.every(Boolean)) {
        setWinner("draw");
        setScores((s) => ({ ...s, draw: s.draw + 1 }));
      } else {
        setCurrent(current === "X" ? "O" : "X");
        if (current === "X") {
          setTimeout(() => aiMove(next), 400);
        }
      }
    },
    [board, current, winner]
  );

  const aiMove = (currentBoard: Board) => {
    const move = bestMove(currentBoard);
    if (move === -1) return;

    const next = [...currentBoard];
    next[move] = "O";
    const win = checkWinner(next);

    setBoard(next);

    if (win) {
      setWinner(win);
      setScores((s) => ({ ...s, [win]: s[win] + 1 }));
      animateWin(move);
    } else if (next.every(Boolean)) {
      setWinner("draw");
      setScores((s) => ({ ...s, draw: s.draw + 1 }));
    } else {
      setCurrent("X");
    }
  };

  const animateWin = (index: number) => {
    gsap.fromTo(
      `.ttt-cell:nth-child(${index + 1})`,
      { scale: 1 },
      {
        scale: 1.06,
        duration: 0.25,
        repeat: 3,
        yoyo: true,
        ease: "power2.inOut",
      }
    );
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setWinner(null);
    setGameKey((k) => k + 1);
  };

  const statusText = winner
    ? winner === "draw"
      ? "Draw!"
      : `${winner} wins!`
    : `${current}'s turn`;

  return (
    <div ref={containerRef} className="ttt">
      <div className="ttt-status">{statusText}</div>

      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`ttt-cell ${cell ? `mark-${cell.toLowerCase()}` : ""} ${
              winningLine?.includes(i) ? "winning" : ""
            }`}
            onClick={() => handleClick(i)}
            disabled={!!cell || !!winner}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="ttt-scores">
        <span className="score-x">X: {scores.X}</span>
        <span className="score-draw">Draw: {scores.draw}</span>
        <span className="score-o">O: {scores.O}</span>
      </div>

      <button className="ttt-reset" onClick={reset}>
        New Game
      </button>
    </div>
  );
}

function checkWinner(board: Board): Player | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function findWinningLine(board: Board): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

function bestMove(board: Board): number {
  let best = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const next = [...board];
    next[i] = "O";
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function minimax(board: Board, isMax: boolean): number {
  const win = checkWinner(board);
  if (win === "O") return 1;
  if (win === "X") return -1;
  if (board.every(Boolean)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      const next = [...board];
      next[i] = "O";
      best = Math.max(best, minimax(next, false));
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const next = [...board];
    next[i] = "X";
    best = Math.min(best, minimax(next, true));
  }
  return best;
}
