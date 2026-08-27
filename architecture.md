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

### Settings Panel
Owns the user-facing form for custom durations and autoStart preferences.
Reads/writes through the useSettings hook, never directly through
storageService. Validates input before it reaches TimerSettings (reject
negative or zero durations). Implemented in Phase 4, alongside persistence,
since settings have no effect until they can be saved and reloaded.

### Reward Service
Tracks gifts earned from completed FOCUS sessions and persists them
through the same Storage Service used for settings/statistics — no
separate storage mechanism.

Exposes the current gift collection to the Environment for rendering.

Contains no timer logic and never modifies TimerState.

Additional reward responsibilities:

- Determines reward rarity from the completed session duration.
- Selects exactly one gift for each eligible completed FOCUS session.
- Prevents duplicate rewards for the same session.
- Maintains the distinction between the complete collection and the
  currently displayed nest items.
- Does not control the timer.
- Does not alter session completion state.

### Audio Service
Responsible for all optional audio playback.
Responsibilities:
- Start and stop Focus background music.
- Start and stop Break background music.
- Loop background tracks while the corresponding session is active.
- Control background music volume.
- Play the completion sound when a FOCUS session reaches COMPLETED.
- Fade background music down/up when appropriate.
- Respect the user's persisted audio preferences.
- Handle browser/mobile autoplay restrictions gracefully.
- Prevent multiple copies of the same audio track from playing simultaneously.
- Never modify TimerState directly.
- Never become a dependency required for timer operation.

The Audio Service should be independent from Timer Engine logic.

### Audio State
Audio state should be derived from timer/session state and user preferences.
Example:
IDLE -> no background audio
FOCUSING -> Focus music if enabled
SHORT_BREAK -> Break music if enabled
LONG_BREAK -> Break music if enabled
PAUSED -> pause/fade audio according to the user's configured behavior
COMPLETED -> fade background music and play completion sound
Audio playback errors must be isolated from the timer.

## 4. Data Flow

1. User presses Start.
2. Timer controller changes state to FOCUSING.
3. Timer engine records the start timestamp.
4. UI subscribes to timer state.
5. Bird companion changes to focus state.
6. On completion, timer engine emits a session completion event.
7. Statistics service records the completed session.
7a. If the completed session was a focus session, Reward Service adds a
    gift record and the bird carries it into the nest, alongside the
    happy animation from step 8.
8. Bird changes to happy state.
9. Notification service provides optional completion feedback.
10. Timer transitions to the next configured session.

### Audio flow
When a FOCUS session starts:
1. Timer enters FOCUSING.
2. Audio Service checks the user's Focus Music preference.
3. If enabled and playback is permitted, Focus music begins/continues.
4. Music loops quietly in the background.
When the user pauses:
1. Timer enters PAUSED.
2. Audio Service pauses or gently fades the background music.
3. Timer remains fully functional even if audio cannot be paused or controlled.
When the session completes:
1. Timer reaches COMPLETED.
2. Audio Service fades/stops the current background music.
3. Audio Service plays the short completion sound.
4. Notification Service sends the completion notification if permitted.
5. Existing bird completion animation and reward flow continue normally.
Audio must not block or delay any timer transition.

## 5. Persistence

MVP persistence should be local-first.

Persist:
- Timer settings.
- Completed session records.
- Daily streak information.
- User preferences.
- Collected gift/reward records.
- User audio preferences, including:
  - Focus Music enabled/disabled
  - Break Music enabled/disabled
  - Background music volume
  - Completion sound enabled/disabled
  - Completion sound volume
Use the existing Storage Service/schema.
Do not create a separate storage mechanism for audio settings.

Do not persist:
- Unnecessary personal information.
- Sensitive user data.
- Raw browsing/activity data unrelated to the timer.

### 5.1 Future mobile/Firebase storage direction (not implemented in the MVP)

Recorded for future phases. **Do not implement in the MVP.**

#### Firebase service split
- **Firebase Auth** — handles identity/authentication (create account, sign in, sign out, password recovery).
- **Cloud Firestore** — stores user settings, completed sessions, statistics, streaks, and any other explicitly approved synced data.
- **Device-local/offline storage** — caches data, holds temporary state, supports offline operation, and acts as Firebase's offline persistence layer. It is **not** the source of truth for synced user data.

#### Firestore structure

```text
users/{uid}/
  profile
  settings
  statistics
  sessions/{sessionId}
```

- The schema is a starting point and may be refined later.
- All cloud data is scoped to the user's UID (`users/{uid}/...`).

#### Static assets are NOT user data
- Bird SVGs (`bird-idle.svg`, `bird-focus.svg`, `bird-break.svg`, `bird-happy.svg`, `bird-sleeping.svg`) are application assets, not user data.
- They must **not** be stored in Firestore.
- They remain application assets shipped with the app, exactly as in the MVP.

#### Firebase pricing plan
- Initial backend plan: **Firebase Spark (free) plan**.
- The app must be quota-conscious: avoid unnecessary reads/writes, repeated listeners, large documents, and per-second sync.
- The project may move to a paid Firebase plan later if usage justifies it.

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

### 6.1 Future mobile platform direction (not implemented in the MVP)

Target platforms for the mobile phase:
- **Android** first.
- **iOS** second.

Preferred mobile implementation direction:
- **React Native + Expo** — preferred, because the project is already React/TypeScript-based, which minimizes context switching and allows shared component/state concepts to be reused.
- **Do not migrate** the existing MVP to React Native/Expo in this task or in the MVP phases. This is a future-phase direction only.

The mobile app must preserve the Pomodoro Bird identity: the timer remains the primary interaction, and the bird remains the visual companion.

#### Mobile navigation model (reference)

The mobile design reference (design.md §17) specifies a 5-tab bottom
navigation: Home, Focus, Nest, Stats, Settings. This is a genuine
architecture addition relative to the current single-screen web SPA and
must be scoped as its own task when the mobile phase begins — it is not
implied by any existing web component split. Do not begin implementing
this navigation structure now; record it here for future scoping only.

## 7. Architectural Rules

- Timer logic must be independent from UI.
- Assets must be independent from business logic.
- Components should remain small and composable.
- Browser APIs must be wrapped behind services/hooks.
- No direct storage manipulation from presentation components.
- No AI-generated asset should silently replace an approved production asset.
