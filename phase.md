# Project Phases — Pomodoro Bird

## Phase 0 — Foundation

### Goal
Establish the project and design foundation.

Tasks:
- Create React + TypeScript + Vite project.
- Configure ESLint and Prettier.
- Create initial folder structure.
- Add the approved bird SVG assets.
- Add the first environment asset.
- Create design tokens.
- Create base application layout.

**Exit criteria:** App runs locally with the correct structure and visual foundation.

---

## Phase 1 — Timer MVP

### Goal
Build a reliable Pomodoro engine.

Tasks:
- Define timer/session types.
- Implement timer state machine.
- Implement timestamp-based countdown.
- Implement start/pause/resume/reset.
- Implement skip.
- Implement focus/short-break/long-break transitions.
- Implement configurable durations.
- Build timer UI.

**Exit criteria:** Timer behavior is reliable and covered by tests.

---

## Phase 2 — Bird Companion

### Goal
Connect the bird to timer states.

Tasks:
- Add BirdCompanion component.
- Map timer states to SVG states.
- Add subtle transitions.
- Add completion animation.
- Respect reduced-motion preferences.

**Exit criteria:** Bird state always matches timer state.

---

## Phase 3 — Environment and Visual Design

### Goal
Create the signature Pomodoro Bird experience.

Tasks:
- Add the main cozy environment.
- Place bird within environment.
- Add responsive layout.
- Implement design tokens.
- Refine typography, spacing, controls, and timer hierarchy.
- Optimize environment asset size.

**Exit criteria:** Focus screen looks polished on desktop and mobile.

---

## Phase 4 — Persistence and Statistics

### Goal
Give users lightweight progress feedback.

Tasks:
- Build SettingsPanel UI allowing the user to set custom focus, short-break,
  and long-break durations, sessions-before-long-break, and autoStart flags.
- Wire SettingsPanel to the existing TimerSettings type and usePomodoro hook
  (no changes to timerEngine.ts required — it already accepts TimerSettings).
- Store settings (persist SettingsPanel values via storageService).
- Store completed sessions.
- Calculate daily totals.
- Implement streak logic.
- Add session counter/history.
- Validate persisted data (reject negative/zero durations per rules.md
  "Invalid settings"; fall back to DEFAULT_TIMER_SETTINGS on corrupt data).

**Exit criteria:** User can set custom session durations through the UI,
and reloading the app preserves valid settings and progress.

---

## Phase 5 — Notifications and Accessibility

### Goal
Make the application practical for real use.

Tasks:
- Add in-app completion feedback.
- Add optional sound.
- Add browser notifications.
- Add keyboard navigation.
- Add accessible labels.
- Add reduced-motion support.
- Test focus visibility and contrast.

**Exit criteria:** Core workflows are accessible and robust.

---

## Phase 6 — Testing and Quality

### Goal
Prepare the MVP for release.

Tasks:
- Unit test timer engine.
- Test session transitions.
- Test persistence.
- Test key UI interactions.
- Test responsive layouts.
- Check browser compatibility.
- Remove console errors.
- Optimize assets.
- Run production build.

**Exit criteria:** No known critical MVP defects.

---

## Phase 7 — Release

### Goal
Ship the first usable version.

Tasks:
- Production build.
- Deploy.
- Verify production timer accuracy.
- Verify local persistence.
- Verify notifications where supported.
- Add basic product documentation.

**Exit criteria:** MVP is publicly usable.

---

## Phase 8 — Post-MVP

Only begin after MVP stability.

Possible features:
- Multiple environments.
- Nest growth.
- Bird customization.
- More themes.
- Advanced statistics.
- PWA/offline improvements.
- Cloud synchronization.
- Accounts, only if product requirements justify them.

### Mobile/Firebase additions (future roadmap)

Recorded requirements for future phases. These are **additions to the roadmap, not changes to completed phases** — Phase 2 (Bird Companion) and all earlier completed work are unaffected. **Do not implement any of these in the MVP.**

- **Mobile implementation** via React Native + Expo (Android first, iOS second).
- **Firebase Authentication** — accounts: create, sign in, sign out, password recovery.
- **Cloud Firestore** — user data storage (settings, completed sessions, statistics, streaks), scoped under `users/{uid}/...`.
- **Cross-device sync** — the same account on another device retrieves synced data.
- **Offline sync** — the timer continues offline; data syncs when a connection returns.
- **Android testing** — test on Android devices/emulators.
- **Google Play Store prep** — prepare the Android app for the Google Play Store (first distribution goal).
- **iOS testing** — test on iOS devices/simulators.
- **Apple App Store prep** — prepare the iOS app for the Apple App Store (subsequent distribution goal).

> **Updated Direction:** The Phase 8 line "Accounts, only if product requirements justify them" is now superseded by this explicit mobile/Firebase direction: accounts and cloud sync are approved requirements for future phases.
