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

### Timer engine design
The timer engine (`src/services/timer/timerEngine.ts`) is a pure, framework-independent module. Remaining time is always derived from timestamps: `remaining = targetEndTime - currentTime`. Every function takes `now` as an explicit argument so tests control time without mocking `Date`. All state transitions route through one pure function, `nextState`, over the 8 states in `architecture.md` §3.

### Focus-count contract
`completedFocusInCycle` in the transition context is the **pre-action** count. A focus session ending (via skip or natural completion) counts as `+1`; a long break ending resets it to `0`; skipping a break leaves it unchanged. Break-vs-long-break decisions use `completedFocusInCycle + 1 >= sessionsBeforeLongBreak`. This contract is documented in the engine and enforced by tests.

### Asset separation
Bird and environment remain separate assets.

### Privacy
No account or backend is required for MVP.

### AI boundary
AI can assist with implementation, tests, documentation, and visual assets, but it must not silently change requirements, architecture, dependencies, privacy behavior, or timer behavior.

## Currently Working On

**Current stage:** Phase 1 — Timer MVP (completed).

### Phase 1 — Timer MVP (completed)

- Timer engine implemented (`src/services/timer/timerEngine.ts`): pure, framework-independent, timestamp-based countdown (`targetEndTime - now`), explicit `now` argument for testable time, no React imports, no new dependencies.
- Single transition function `nextState(current, action, context)` over the full 8-state machine from `architecture.md` §3 (IDLE, FOCUSING, FOCUS_PAUSED, SHORT_BREAK, SHORT_BREAK_PAUSED, LONG_BREAK, LONG_BREAK_PAUSED, COMPLETED). Sessions transition through COMPLETED before the next session; `autoStartBreaks`/`autoStartFocus` respected.
- Start/pause/resume/reset/skip actions with pause freezing remaining time and resume recomputing `targetEndTime` without drift.
- `SESSION_COMPLETED` engine events emitted with payload `{ mode, completedFocusInCycle, nextMode }` (consumed by later phases; hook intentionally ignores them for now).
- `usePomodoro` hook (`src/hooks/usePomodoro.ts`) wraps the engine: 500 ms tick, lazy-ref engine init, stable interval refs, throttled-tab recovery, snapshot updates only when state actually changes.
- Timer UI added (`src/components/timer/`): `Timer.tsx` (mm:ss + calm session label, `role="timer"`, tabular-nums), `TimerControls.tsx` (Start/Pause/Resume, Reset, Skip — accessible, keyboard operable, disabled states), `TimerProgress.tsx` (SVG ring from remaining/duration with `role="progressbar"`, not color-only). Separate CSS per component.
- App wired (`App.tsx`): Phase 0 placeholder removed; real timer panel driven by `usePomodoro`; bird state derived via the existing `timerStateToBirdState()` (no duplicated mapping).
- Minimal deviation: `birdStates.ts` `timerStateToBirdState` extended to accept `LONG_BREAK_PAUSED` (Phase 0 omitted it; the mapping now covers all 8 timer states). No other bird/environment code touched.
- Settings (minimum viable): in-memory defaults in `src/types/timer.ts` (`DEFAULT_TIMER_SETTINGS`: 25/5/15 min, 4 sessions before long break, auto-start off); engine and hook accept a `TimerSettings` object.
- Types extended only where genuinely needed: `SessionCompletionPayload`, `TimerEngineEvent`, `DEFAULT_TIMER_SETTINGS`; `isBreakState` fixed to include `LONG_BREAK_PAUSED`. All existing types unchanged.
- Tests added (`tests/timer/`, 34 tests): engine (21), state machine (8), time formatting (3), existing timer types (2) — plus Phase 0 component tests (14), total **48 tests passing**.
- Validation passed: `npx tsc -b --force`, ESLint (0 errors, 0 warnings), Vitest (48/48), `vite build`.

Next major stage:
- **Phase 2 — Bird animation:** connect bird states to timer transitions with animated behavior.

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
