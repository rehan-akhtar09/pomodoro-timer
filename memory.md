# Project Memory — Pomodoro Bird

## Purpose

This file is the persistent project memory for the Pomodoro Bird application.

It records:
- What has happened.
- What has been decided.
- What is currently being worked on.
- Why decisions were made.
- What should happen next.

Update this file whenever an important project decision changes.

## Project Identity

**Project name:** Pomodoro Bird  
**Product type:** Pomodoro productivity web application  
**Core concept:** A simple, reliable Pomodoro timer with a friendly 2D bird companion and cozy environment.

## What Happened

### Previous concept
The project originally considered a dog-based companion concept.

### Current decision
The companion has been changed from a dog to a **bird**.

The bird should be the product's recognizable visual companion while the timer remains the primary product function.

### Asset decision
The bird should use SVG assets so it can:
- Scale cleanly.
- Be reused across screens.
- Be animated easily.
- Remain visually consistent.

Current bird states created:
- `bird-idle.svg`
- `bird-focus.svg`
- `bird-break.svg`
- `bird-happy.svg`
- `bird-sleeping.svg`

### Environment decision
The environment should not be built entirely as individual SVG elements.

Current direction:
- Bird = SVG.
- Main environment = AI-generated/illustrated background asset.
- Small interactive/reusable decorations = SVG or CSS where appropriate.

This keeps the project visually rich without creating unnecessary asset-management complexity.

## Current Product Direction

The application should be:
- Calm.
- Cozy.
- Modern.
- Simple.
- Focused on the timer.
- Lightly gamified, not game-first.

The bird may later interact with a nest/progress system.

## Current MVP

The MVP includes:
1. Pomodoro timer.
2. Start/pause/resume/reset.
3. Skip.
4. Focus/short-break/long-break cycles.
5. Bird state changes.
6. One cozy environment.
7. Session count.
8. Daily streak.
9. Local settings persistence.
10. Optional notifications/sound.
11. Responsive UI.
12. Accessibility basics.

## Current Technical Direction

Recommended:
- React.
- TypeScript.
- Vite.
- CSS.
- SVG.
- localStorage.
- Vitest.
- React Testing Library.
- ESLint.
- Prettier.

Architecture is client-first and local-first for MVP.

## Important Decisions

### Timer accuracy
Timer correctness must be based on timestamps/elapsed time, not merely decrementing a variable every second.

### Asset separation
Bird and environment remain separate assets.

### Privacy
No account or backend is required for MVP.

### AI boundary
AI can assist with implementation, tests, documentation, and visual assets, but it must not silently change requirements, architecture, dependencies, privacy behavior, or timer behavior.

## Currently Working On

**Current stage:** Phase 0 — Foundation (completed).

Completed:
- Product concept selected.
- Bird companion selected.
- Bird SVG states created.
- Environment strategy selected.
- Project documentation established.
- React + TypeScript + Vite project initialized (`package.json`, tsconfigs, Vite config).
- ESLint and Prettier configured.
- Folder structure created per `architecture.md`.
- Approved bird SVGs moved from project root to `public/assets/birds/`.
- Design tokens created in `src/styles/design-tokens.css` using the design.md starting palette.
- Base app shell created (`App.tsx`, `main.tsx`, `App.css`, globals).
- Bird component foundation created (`BirdCompanion.tsx`, `birdStates.ts`) with the five states mapped to approved SVG paths.
- Environment component foundation created (`Environment.tsx`) — replaceable placeholder backdrop, bird kept separate.
- Timer architecture preparation added (`src/types/timer.ts`): session modes, timer states, settings, active session shape, and helpers — ready for the Phase 1 timestamp-based engine.
- Tests added: bird state mapping, BirdCompanion rendering, Environment rendering, timer type helpers (16 tests, all passing).
- Validation passed: `tsc` strict, ESLint, Vitest (16/16), `vite build`, dev server starts.

Next major stage:
- **Phase 1 — Timer MVP:** implement the timer engine, state machine, and timestamp-based countdown.
- Phase 2 — connect the bird to timer states.

## Future Direction

After MVP stability:
- Multiple environments.
- Nest growth.
- Bird customization.
- More themes.
- Better statistics.
- Optional PWA/offline features.
- Cloud synchronization only if justified.

## Memory Maintenance Rules

When updating this file:
- Keep completed decisions.
- Replace obsolete decisions with the current decision.
- Record important architectural changes.
- Record why major decisions were made.
- Do not use this file as a dump for temporary debugging logs.
