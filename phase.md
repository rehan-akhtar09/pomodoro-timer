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
- Store settings.
- Store completed sessions.
- Calculate daily totals.
- Implement streak logic.
- Add session counter/history.
- Validate persisted data.

**Exit criteria:** Reloading the app preserves valid settings and progress.

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
