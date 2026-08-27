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

## Mobile/Firebase Direction (recorded 2026-08-27)

A new product direction has been recorded for future phases. It does **not** change the completed MVP phases (Phase 1 and Phase 2 are unchanged), and nothing here is implemented in code yet.

- **Android first**, iOS subsequent.
- **Google Play Store** is the first distribution goal; **Apple App Store** subsequent.
- **Firebase Authentication** provides accounts (create, sign in, sign out, password recovery).
- **Cloud Firestore** stores synced data (settings, completed sessions, statistics, streaks) under `users/{uid}/...`.
- **Firebase UID** identifies a user's cloud data; data is scoped to the UID.
- **Same account on another device** retrieves the synced data (cross-device).
- **Offline functionality is required**: the timer keeps working without a connection; data syncs when a connection returns.
- **Timer execution remains local**: the countdown is still computed locally from timestamps.
- **The countdown must not sync every second**; only meaningful events (session starts, session completes) sync.
- **Firebase Spark (free) plan** is the initial backend plan; the app must be quota-conscious and may move to a paid plan later if usage justifies it.
- **Static assets** (bird SVGs) remain application assets and are never stored in Firestore.
- **Future mobile implementation direction:** React Native + Expo. The existing React/TypeScript MVP is **not** migrated in the MVP phases.

## Important Decisions

### Timer accuracy
Timer correctness must be based on timestamps/elapsed time, not merely decrementing a variable every second.

### Bird sleeping trigger
The bird's `sleeping` state is **bird-layer-only**. There is no `Sleeping` `TimerState` (the engine keeps its 8 states). `BirdCompanion` uses a local `useIdleSleepTimer` hook: after 5 continuous minutes of `IDLE` (user-approved threshold), the bird falls asleep; any timer interaction that moves the bird off `idle` (START, PAUSE, RESUME, RESET, SKIP) wakes it immediately. The timer state mapping is unchanged — `timerStateToBirdState` never returns `sleeping`.

### Timer engine design
The timer engine (`src/services/timer/timerEngine.ts`) is a pure, framework-independent module. Remaining time is always derived from timestamps: `remaining = targetEndTime - currentTime`. Every function takes `now` as an explicit argument so tests control time without mocking `Date`. All state transitions route through one pure function, `nextState`, over the 8 states in `architecture.md` §3.

### Focus-count contract
`completedFocusInCycle` in the transition context is the **pre-action** count. A focus session ending (via skip or natural completion) counts as `+1`; a long break ending resets it to `0`; skipping a break leaves it unchanged. Break-vs-long-break decisions use `completedFocusInCycle + 1 >= sessionsBeforeLongBreak`. This contract is documented in the engine and enforced by tests.

### Asset separation
Bird and environment remain separate assets.

### Privacy
No account or backend is required for MVP.

> **Updated Direction (recorded 2026-08-27):** A later product decision adds accounts (Firebase Auth) and cloud synchronization (Cloud Firestore) for future phases. The MVP itself still requires no account or backend; the statement above remains true for the MVP and is not deleted.

### AI boundary
AI can assist with implementation, tests, documentation, and visual assets, but it must not silently change requirements, architecture, dependencies, privacy behavior, or timer behavior.

## Currently Working On

**Current stage:** Phase 2 — Bird Companion (completed).

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

### Phase 2 — Bird Companion (completed)

- Per-state CSS motion in `src/components/bird/BirdCompanion.css` (design.md §7, §9): idle/focus slow breathing (`bird-breathe`, 6s); break playful stretch/hop (`bird-play`, 900ms, transform-only so proportions are never distorted); happy short one-shot celebration (`bird-celebrate`, 1.1s — COMPLETED is transient and held until START, so the animation runs once and settles); sleeping gentle breathing (`bird-sleep`).
- Motion classes applied per state via `BIRD_MOTION_CLASS` in `BirdCompanion.tsx`; transitions cross-fade with `opacity`/`transform` `transition` on `.bird-companion__image` (no hard cuts).
- Sleeping trigger implemented as a bird-layer-only hook `src/hooks/useIdleSleepTimer.ts`: after `IDLE_SLEEP_TIMEOUT_MS` (5 min, user-approved) of continuous `idle` the bird renders as `sleeping`; any change to the timer state resets it. No timerEngine / usePomodoro / Timer component changes.
- Reduced motion: new `src/hooks/usePrefersReducedMotion.ts` reads `prefers-reduced-motion` via `matchMedia`; when reduce is active all motion classes are omitted entirely (testable), and CSS `@media (prefers-reduced-motion: reduce)` disables animation/transition as a fallback. State is never communicated by animation alone — each state uses its distinct SVG.
- Tests extended (`tests/components/BirdCompanion.test.tsx`, 20 tests): all 5 states render (incl. `sleeping`), `data-bird-state` reflects sleeping after the mocked-clock idle timeout, bird wakes when leaving idle early, motion class per state, and reduced-motion removes every motion class. `timerStateToBirdState` coverage extended (`LONG_BREAK_PAUSED`, and verified it never returns `sleeping`). Total **56 tests passing**.
- Validation passed: ESLint (0 errors), Vitest (56/56), `npx tsc -b --force`, `vite build`. Committed and pushed to GitHub (`main`).

Next major stage:
- **Phase 3 — Environment:** implement the cozy workspace environment behind the bird.

## Reward System Direction (recorded 2026-08-27)

Pomodoro Bird now has a defined lightweight reward system. It is a documented product decision (see PRD.md "Focus Rewards — Gifts & Nest", phase.md Phase 4B, architecture.md §3 Reward Service, design.md §16, rules.md "Reward System Rules") and is **not yet implemented in code**.

- Completing a FOCUS session grants exactly one gift.
- The bird brings the gift into the nest/world.
- Initial gift categories include seeds, leaves, feathers, flowers, berries, twigs, nest materials, and special decorations.
- Gifts have four rarity levels: Common, Uncommon, Rare, Very Rare.
- Longer focus sessions have improved rarity targets.
- Reward records reference completed session IDs.
- Duplicate reward creation must be prevented.
- The complete collection is persistent.
- The nest has a limited visible display (12 items) to prevent visual clutter.
- Rewards never punish missed sessions.
- Reward functionality remains secondary to the timer.
- Reward persistence uses the same Storage Service.
- Future cloud implementation must secure user-owned reward data through Firebase Authentication and Firestore Security Rules.

## Future Direction

After MVP stability:
- Multiple environments.
- Nest growth.
- Bird customization.
- More themes.
- Better statistics.
- Optional PWA/offline features.
- Cloud synchronization only if justified.

> **Updated Direction (recorded 2026-08-27):** cloud synchronization (and accounts) are now approved requirements for future phases, per the Mobile/Firebase Direction above. The original "only if justified" line is kept for historical context but is superseded by the new direction.

## Memory Maintenance Rules

When updating this file:
- Keep completed decisions.
- Replace obsolete decisions with the current decision.
- Record important architectural changes.
- Record why major decisions were made.
- Do not use this file as a dump for temporary debugging logs.
