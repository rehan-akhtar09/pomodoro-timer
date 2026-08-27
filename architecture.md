# Architecture — Pomodoro Bird

## 1. Architecture Overview

Pomodoro Bird is a client-first productivity application.

### High-level architecture

```text
User
  |
  v
UI Layer
  |
  +--> Timer Controller
  |       |
  |       +--> Session State Machine
  |       +--> Time Calculation
  |       +--> Notification Service
  |
  +--> Bird Companion
  |       |
  |       +--> Bird SVG Assets
  |       +--> State/Animation Mapping
  |
  +--> Environment Renderer
  |
  +--> Statistics / Streaks
  |
  +--> Settings
  |
  v
Local Persistence
(localStorage or IndexedDB where appropriate)
```

## 2. Recommended Application Structure

```text
pomodoro-bird/
├── public/
│   ├── assets/
│   │   ├── birds/
│   │   │   ├── bird-idle.svg
│   │   │   ├── bird-focus.svg
│   │   │   ├── bird-break.svg
│   │   │   ├── bird-happy.svg
│   │   │   └── bird-sleeping.svg
│   │   └── environments/
│   │       └── cozy-room.webp
│   └── favicon.svg
│
├── src/
│   ├── components/
│   │   ├── timer/
│   │   │   ├── Timer.tsx
│   │   │   ├── TimerControls.tsx
│   │   │   └── TimerProgress.tsx
│   │   ├── bird/
│   │   │   ├── BirdCompanion.tsx
│   │   │   └── birdStates.ts
│   │   ├── environment/
│   │   │   └── Environment.tsx
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx
│   │   ├── stats/
│   │   │   └── SessionStats.tsx
│   │   └── ui/
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── usePomodoro.ts
│   │   ├── useSettings.ts
│   │   └── useSessionStats.ts
│   │
│   ├── services/
│   │   ├── timer/
│   │   │   └── timerEngine.ts
│   │   ├── notifications/
│   │   │   └── notificationService.ts
│   │   └── storage/
│   │       └── storageService.ts
│   │
│   ├── state/
│   │   └── pomodoroStore.ts
│   │
│   ├── types/
│   │   ├── timer.ts
│   │   ├── settings.ts
│   │   └── stats.ts
│   │
│   ├── utils/
│   │   ├── time.ts
│   │   ├── dates.ts
│   │   └── validation.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── design-tokens.css
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── tests/
│   ├── timer/
│   ├── storage/
│   └── components/
│
├── PRD.md
├── architecture.md
├── rules.md
├── phase.md
├── design.md
└── memory.md
```

## 3. Component Responsibilities

### App
Owns application composition and global layout.

### Timer Controller
Owns the Pomodoro session lifecycle. It should not contain presentation-specific styling.

### Timer Engine
Calculates remaining time using timestamps/durations. It must not depend on animation frame frequency for correctness.

### Session State Machine
Recommended states:

```text
IDLE
FOCUSING
FOCUS_PAUSED
SHORT_BREAK
SHORT_BREAK_PAUSED
LONG_BREAK
LONG_BREAK_PAUSED
COMPLETED
```

Transitions must be explicit and predictable.

### Bird Companion
Maps timer state to bird state:

```text
IDLE -> idle
FOCUSING -> focus
SHORT_BREAK/LONG_BREAK -> break
COMPLETED -> happy
rest/sleep state -> sleeping
```

### Environment
Renders the visual scene independently from the bird. The environment should be replaceable without modifying timer logic.

### Storage Service
Provides a small abstraction over browser persistence. Components should not directly manipulate localStorage keys.

## 4. Data Flow

1. User presses Start.
2. Timer controller changes state to FOCUSING.
3. Timer engine records the start timestamp.
4. UI subscribes to timer state.
5. Bird companion changes to focus state.
6. On completion, timer engine emits a session completion event.
7. Statistics service records the completed session.
8. Bird changes to happy state.
9. Notification service provides optional completion feedback.
10. Timer transitions to the next configured session.

## 5. Persistence

MVP persistence should be local-first.

Persist:
- Timer settings.
- Completed session records.
- Daily streak information.
- User preferences.

Do not persist:
- Unnecessary personal information.
- Sensitive user data.
- Raw browsing/activity data unrelated to the timer.

## 6. Technology Stack

Recommended stack:

- **TypeScript** — type safety.
- **React** — component-based UI.
- **Vite** — development/build tooling.
- **CSS** — visual system and lightweight animation.
- **SVG** — bird and small UI/vector assets.
- **Web APIs** — Notifications API where supported.
- **localStorage** — MVP settings and lightweight statistics.
- **Vitest** — unit testing.
- **React Testing Library** — component testing.
- **ESLint** — linting.
- **Prettier** — formatting.

A state-management library should only be introduced if application state becomes complex enough to justify it.

## 7. Architectural Rules

- Timer logic must be independent from UI.
- Assets must be independent from business logic.
- Components should remain small and composable.
- Browser APIs must be wrapped behind services/hooks.
- No direct storage manipulation from presentation components.
- No AI-generated asset should silently replace an approved production asset.
