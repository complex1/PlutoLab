# Pluto Labs — Agent Guidelines

Read this before adding or modifying any app, tool, or game in Pluto Labs.

## What Pluto Labs Is

A **client-only** app catalog. Users browse a home screen and open self-contained mini-apps. There is no backend. Each app is a lazy-loaded React module registered in one place.

## Stack

- React 19 + TypeScript + Vite
- React Router (client-side routes)
- GSAP (`@gsap/react`) for UI motion — use sparingly
- CSS files colocated with components (no CSS-in-JS)
- Path alias: `@/` → `src/`

## Design System

Dark flat UI. Reuse CSS variables from `src/index.css`:

| Token | Usage |
|-------|--------|
| `--bg-deep`, `--bg-surface`, `--bg-card` | Backgrounds |
| `--text-primary`, `--text-secondary`, `--text-muted` | Text |
| `--accent-blue`, `--accent-rose`, `--accent-violet`, `--accent-green` | Accents |
| `--border`, `--radius-sm`, `--radius-md` | Borders & radius |
| `--font-display`, `--font-body` | Typography |

**Do not** introduce neon glows, sci-fi fonts, or heavy animations unless the user asks. Keep motion subtle. Entrance animations run **once on load** — never on every game move or state tick.

## Adding a New App — Checklist

### 1. Create the app folder

```
src/apps/<kebab-name>/
  <PascalName>.tsx      # default export — main UI component
  <PascalName>.css      # app-specific styles only
  <name>Logic.ts        # optional — pure game/business logic
  <name>Config.ts       # optional — settings + localStorage
  GameConfigPanel.tsx   # optional — settings modal
  GameConfigPanel.css   # optional
```

**Naming**
- Folder: `kebab-case` (e.g. `flappy-bird`, `tic-tac-toe`)
- Component file: `PascalCase.tsx` matching the feature name
- Logic files: pure functions, no React imports

### 2. Build the component

- Default export a single React component
- **Do not** add your own page header or back button — `AppShell` provides that
- Keep the app content centered; max width ~400px for games/tools
- Use `useRef` + `requestAnimationFrame` for canvas/game loops — avoid React re-renders every frame
- Split logic from UI when the app has non-trivial state (see `calculator/`, `snake/`, `tetris/`)

### 3. Register in the catalog

Edit `src/registry/apps.ts`:

```typescript
const MyApp = lazy(() => import("@/apps/my-app/MyApp"));

// Add to apps array:
{
  id: "my-app",                          // unique kebab-case id
  title: "My App",
  description: "One line for the catalog card.",
  category: "tool",                      // "tool" | "game" | "experiment"
  route: "/apps/my-app",                 // must match id
  accent: "cyan",                        // cyan | magenta | purple | green
  icon: "◆",                             // single character or symbol
  tags: ["utility"],
  component: MyApp,
},
```

Routes are auto-generated from the registry. **Do not** edit `App.tsx` for new apps.

### 4. Verify

```bash
npm run build
```

Fix all TypeScript errors before finishing.

## Architecture Patterns

### Tools (Calculator, Scientific Calculator)

- Reducer or pure logic module for state transitions
- Hook wraps dispatch (`useCalculator.ts` pattern)
- Component is UI only
- Keyboard support where it makes sense

### Games (Snake, Tetris, Flappy Bird)

- `*Logic.ts` — game state, tick, collision, scoring
- Canvas rendering in the component via `useRef`
- `gameRef` for mutable state; React state only for UI labels (score, status)
- Entrance animations: depend on a `gameKey` / `puzzleKey`, **not** on board/cell state
- Best scores: `localStorage` with key `pluto-<app>-best`

### Optional settings panel

Follow the Flappy Bird / Snake pattern:

1. `*Config.ts` — `DEFAULT_CONFIG`, `loadConfig`, `saveConfig`, `clampConfig`, `CONFIG_FIELDS`
2. `GameConfigPanel.tsx` — modal with range sliders
3. `configRef` in the component for the game loop; React state for the panel
4. Save resets the current game; pause input while panel is open
5. Storage key: `pluto-<app>-config`

## Layout & Grid Rules

- Calculator: 4-column grid; wide `0` button uses `grid-column: span 2`
- Scientific calculator: explicit **rows** — do not dump all buttons into one flat grid
- Games: test button/keypad layout — avoid orphan buttons on extra rows

## Files You Should Not Modify

Unless the task requires it:

- `src/components/Layout.tsx`, `AnimatedBackground.tsx` — shell only
- `src/App.tsx` — routing is registry-driven
- `vite.config.ts`, `package.json` — only when adding dependencies

## Dependencies

Prefer zero new packages. Use canvas, CSS, and existing GSAP. If a dependency is truly needed, add it to `package.json` and note it in your summary.

## Commit Scope

- Only change files required for the new app
- Do not refactor unrelated apps
- Do not update README unless asked (this file is the source of truth for agents)

## Reference Apps

| Type | Reference |
|------|-----------|
| Tool + reducer | `src/apps/calculator/` |
| Tool + rows UI | `src/apps/scientific-calculator/` |
| Board game | `src/apps/tic-tac-toe/` |
| Puzzle | `src/apps/sudoku/` |
| Canvas + config | `src/apps/flappy-bird/`, `src/apps/snake/` |
| Canvas + logic split | `src/apps/tetris/` |
