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

## Phase 4B — Reward System (Gifts & Nest)

### Goal

Reward the user visually for completing a focus session: the bird brings
a gift, and the gift becomes a permanent part of the bird's nest/world.

### Reward Rules

- Every completed FOCUS session grants exactly one gift.
- Break completion does not grant a normal gift.
- Skipped or cancelled sessions do not grant a normal gift.
- Longer focus sessions may have improved rarity odds but still grant
  exactly one normal gift.
- Each reward references the completed focus session.
- A completed focus session must never generate more than one reward.
- Earned rewards persist permanently unless the user explicitly deletes
  their data.
- Rewards may accumulate as duplicates.
- The complete collection is persisted even when only a limited number
  of gifts are displayed in the nest.

### Initial Gift Pool

Common:
- Sunflower Seed
- Wheat Bundle
- Small Leaf
- Feather
- Acorn

Uncommon:
- Small Flower
- Berry Cluster
- Small Twig
- Soft Nest Fiber

Rare:
- Decorative Nest Piece
- Special Flower
- Polished Branch

Very Rare:
- Golden Feather
- Rare Nest Ornament
- Special Nest Decoration

### Initial Rarity Targets

15-minute:
- Common 75%
- Uncommon 18%
- Rare 6%
- Very Rare 1%

25-minute:
- Common 70%
- Uncommon 20%
- Rare 8%
- Very Rare 2%

50-minute:
- Common 60%
- Uncommon 25%
- Rare 12%
- Very Rare 3%

90+ minute:
- Common 50%
- Uncommon 30%
- Rare 15%
- Very Rare 5%

These are initial balancing targets and must remain configurable.

### Tasks

- Define a Gift/Reward data model (id, sessionId, type/icon, rarity,
  earnedAt) in a new src/types/rewards.ts file — do not add this to
  types/timer.ts.
- Trigger gift delivery only when a FOCUS session reaches COMPLETED
  (not on break completion, not on skip without completion).
- Add a small set of gift SVG icons under public/assets/gifts/, following
  the same SVG asset rules as the bird assets.
- Extend Environment.tsx to render accumulated earned gifts inside a
  nest/world area, without competing visually with the timer
  (design.md §2 "the timer is the hero").
- Persist earned gifts through the same Storage Service/schema used for
  settings and session stats (Phase 4) — do not create a second,
  separate storage mechanism.
- Respect prefers-reduced-motion: reuse usePrefersReducedMotion from
  Phase 2; gift delivery becomes instant placement, no animation, when
  reduced motion is set.
- Define a cap or rotation/archival behavior for the nest so the scene
  never becomes visually cluttered (design.md "avoid busy patterns/visual
  noise").
- The complete collection must remain persisted even when a gift is no
  longer visible in the nest.
- Protect against duplicate reward creation for the same session.
- Tests: a gift is added exactly once per completed FOCUS session; gifts
  persist across reload; nest rendering never blocks the timer or bird
  from remaining visually dominant.

### Dependency note

This phase depends on Phase 3 (Environment art, for a nest/world area to
render into) and Phase 4 (Storage Service). If those aren't finished yet,
implement only the data model and the completion trigger now, and defer
nest rendering until Phase 3/4 are done — do not invent a temporary
storage mechanism to unblock this early.

### Exit criteria

Completing a focus session visibly delivers a gift into the bird's nest,
and the nest correctly reflects the total number of completed focus
sessions after a reload, while preserving the user's complete reward
collection.

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

### Audio & Cozy Soundscape
Tasks:
- Create the Audio Service.
- Add optimized local Focus music assets.
- Add optimized local Break/ambient music assets.
- Add a short completion sound.
- Implement Focus music playback.
- Implement Break music playback.
- Implement looping.
- Implement volume control.
- Implement independent enable/disable controls.
- Implement completion sound enable/disable.
- Implement gentle fade-in/fade-out behavior.
- Handle pause/resume behavior.
- Handle autoplay restrictions.
- Handle missing/corrupt audio assets gracefully.
- Ensure audio failures never affect timer operation.
- Add automated tests for audio state transitions where practical.
- Verify that only one intended background track is active at a time.

**Exit criteria:** Core workflows are accessible and robust.

The user can optionally enable a calm background soundscape during Focus and Break sessions, control its volume, and receive a short completion sound when a FOCUS session successfully completes. Audio failure or platform restrictions never interrupt timer functionality.

---

## Phase 5B — Bird Behavior & Movement

### Goal
Replace the current mostly-static bird with the richer movement/behavior
system described in design.md §18, fixing the "feels like a stationary
timer" problem, using the reorganized assets under public/assets/ and
the reference spec in docs/design-reference/bird-behavior-spec/.

Tasks:
- Extend BirdState/birdStates.ts with the new pose states (do not remove
  or break the existing 5-state mapping used elsewhere).
- Build the Bird Behavior Controller (movement between named anchors,
  session-length-based sleep policy, near-completion alert).
- Wire gift delivery (RECEIVE_GIFT/CARRY_GIFT/WALK_TO_NEST/PLACE_GIFT)
  into the existing Phase 4B reward-completion flow.
- Implement draggable gift repositioning with normalized-coordinate
  persistence via the existing Storage Service.
- Full reduced-motion compliance (instant state/position updates, no
  skipped final-state visuals).
- Tests: reduced motion behavior, reload persistence of gift positions,
  exactly-once reward/carry behavior, small-screen layout.

**Exit criteria:** The bird visibly moves and reacts throughout a
session rather than remaining static; the acceptance criteria in
docs/design-reference/bird-behavior-spec/bird_animation_spec.md are met
using CSS/SVG (not Rive), respecting reduced motion and existing timer/
reward correctness.

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
- **Mobile design system** — apply the Cozy Minimalism visual language
  documented in design.md §17 (source: Google Stitch export in
  docs/design-reference/mobile-stitch-export/) to the React Native/Expo
  app. The bird and environment shown inside the timer frame MUST be the
  existing live, state-driven BirdCompanion + Environment system ported
  to mobile — never a static placeholder image, regardless of what the
  mockup screens show.
- **Mobile navigation** — implement the 5-tab bottom navigation (Home,
  Focus, Nest, Stats, Settings) described in design.md §17 as its own
  scoped task; this is new relative to the web app's single-screen layout
  (see architecture.md §6.1).

> **Updated Direction:** The Phase 8 line "Accounts, only if product requirements justify them" is now superseded by this explicit mobile/Firebase direction: accounts and cloud sync are approved requirements for future phases.
