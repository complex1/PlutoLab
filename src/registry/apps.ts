import type { ComponentType } from "react";
import { lazy } from "react";

export type AppCategory = "tool" | "game" | "experiment" | "developer";

export interface AppEntry {
  id: string;
  title: string;
  description: string;
  category: AppCategory;
  route: string;
  accent: "cyan" | "magenta" | "purple" | "green";
  icon: string;
  tags: string[];
  component: ComponentType;
}

const Calculator = lazy(() => import("@/apps/calculator/Calculator"));
const ScientificCalculator = lazy(
  () => import("@/apps/scientific-calculator/ScientificCalculator")
);
const TicTacToe = lazy(() => import("@/apps/tic-tac-toe/TicTacToe"));
const Sudoku = lazy(() => import("@/apps/sudoku/Sudoku"));
const FlappyBird = lazy(() => import("@/apps/flappy-bird/FlappyBird"));
const Tetris = lazy(() => import("@/apps/tetris/Tetris"));
const Snake = lazy(() => import("@/apps/snake/Snake"));
const InfiniteCanvas = lazy(() => import("@/apps/infinite-canvas/InfiniteCanvas"));
const PlutoPix = lazy(() => import("@/apps/pluto-pix/PlutoPix"));
const VectorDraw = lazy(() => import("@/apps/vector-draw/VectorDraw"));
const Converter = lazy(() => import("@/apps/converter/Converter"));
const JsPlayground = lazy(() => import("@/apps/js-playground/JsPlayground"));
const JsonLab = lazy(() => import("@/apps/json-lab/JsonLab"));
const RegexTool = lazy(() => import("@/apps/regex/Regex"));
const Storyboard = lazy(() => import("@/apps/storyboard/Storyboard"));

export const apps: AppEntry[] = [
  {
    id: "calculator",
    title: "Calculator",
    description: "Quick arithmetic for everyday math.",
    category: "tool",
    route: "/apps/calculator",
    accent: "cyan",
    icon: "⊕",
    tags: ["math", "utility"],
    component: Calculator,
  },
  {
    id: "scientific-calculator",
    title: "Scientific Calculator",
    description: "Trig, logs, powers, and advanced functions.",
    category: "tool",
    route: "/apps/scientific-calculator",
    accent: "purple",
    icon: "∑",
    tags: ["math", "science"],
    component: ScientificCalculator,
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Classic X vs O — beat the AI.",
    category: "game",
    route: "/apps/tic-tac-toe",
    accent: "magenta",
    icon: "✕",
    tags: ["classic", "puzzle"],
    component: TicTacToe,
  },
  {
    id: "sudoku",
    title: "Sudoku",
    description: "Fill the grid with logic.",
    category: "game",
    route: "/apps/sudoku",
    accent: "green",
    icon: "▦",
    tags: ["puzzle", "logic"],
    component: Sudoku,
  },
  {
    id: "flappy-bird",
    title: "Flappy Bird",
    description: "Tap to fly through the pipes.",
    category: "game",
    route: "/apps/flappy-bird",
    accent: "magenta",
    icon: "▴",
    tags: ["arcade", "classic"],
    component: FlappyBird,
  },
  {
    id: "tetris",
    title: "Tetris",
    description: "Stack blocks and clear lines.",
    category: "game",
    route: "/apps/tetris",
    accent: "purple",
    icon: "▣",
    tags: ["arcade", "classic"],
    component: Tetris,
  },
  {
    id: "snake",
    title: "Snake",
    description: "Eat food, grow longer, don't crash.",
    category: "game",
    route: "/apps/snake",
    accent: "green",
    icon: "◎",
    tags: ["arcade", "classic"],
    component: Snake,
  },
  {
    id: "infinite-canvas",
    title: "Infinite Canvas",
    description: "Draw shapes, text, and images on an endless board.",
    category: "tool",
    route: "/apps/infinite-canvas",
    accent: "cyan",
    icon: "✦",
    tags: ["creative", "drawing"],
    component: InfiniteCanvas,
  },
  {
    id: "pluto-pix",
    title: "PlutoPix",
    description: "Browser photo editor with layers, filters, and export.",
    category: "tool",
    route: "/apps/pluto-pix",
    accent: "magenta",
    icon: "◐",
    tags: ["creative", "photo", "editor"],
    component: PlutoPix,
  },
  {
    id: "converter",
    title: "Converter",
    description: "Fast unit conversion for length, weight, temperature, and more.",
    category: "tool",
    route: "/apps/converter",
    accent: "purple",
    icon: "⇄",
    tags: ["utility", "math", "conversion"],
    component: Converter,
  },
  {
    id: "js-playground",
    title: "JS Playground",
    description: "Write, run, and test JavaScript with Monaco editor and console output.",
    category: "developer",
    route: "/apps/js-playground",
    accent: "green",
    icon: "{ }",
    tags: ["javascript", "code", "monaco"],
    component: JsPlayground,
  },
  {
    id: "json-lab",
    title: "JSON Lab",
    description: "Format, validate, search, and explore JSON with a tree viewer.",
    category: "developer",
    route: "/apps/json-lab",
    accent: "cyan",
    icon: "{ }",
    tags: ["json", "api", "developer"],
    component: JsonLab,
  },
  {
    id: "regex",
    title: "REGEX",
    description: "Test JavaScript regex patterns with live highlights, groups, and replace preview.",
    category: "developer",
    route: "/apps/regex",
    accent: "magenta",
    icon: ".*",
    tags: ["regex", "javascript", "developer"],
    component: RegexTool,
  },
  {
    id: "storyboard",
    title: "Storyboard",
    description: "Plan shots with sketches, dialogue, camera notes, and export to PDF or PNG.",
    category: "tool",
    route: "/apps/storyboard",
    accent: "purple",
    icon: "▤",
    tags: ["creative", "video", "planning"],
    component: Storyboard,
  },
  {
    id: "vector-draw",
    title: "Vector Draw",
    description: "SVG vector editor with bezier pen, shapes, layers, and export.",
    category: "tool",
    route: "/apps/vector-draw",
    accent: "cyan",
    icon: "◇",
    tags: ["creative", "svg", "design"],
    component: VectorDraw,
  },
];

export function getAppByRoute(route: string): AppEntry | undefined {
  return apps.find((app) => app.route === route);
}
