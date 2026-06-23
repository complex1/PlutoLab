# Pluto Labs

A client-side app catalog — discover tools, games, and experiments from one place.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Adding a New App

See **[AGENTS.md](./AGENTS.md)** for full guidelines (required reading for AI agents and contributors).

Quick version:

1. Create `src/apps/your-app/YourApp.tsx` (+ CSS, optional logic/config files)
2. Register in `src/registry/apps.ts`
3. Run `npm run build`

## Stack

- React + TypeScript + Vite
- React Router
- GSAP animations
- 100% client-side
# PlutoLab
