# Product Requirements Document — Pomodoro Bird

## 1. Product Definition

**Product:** Pomodoro Bird  
**Type:** Focus and productivity web application  
**Core concept:** A calm Pomodoro timer built around a friendly 2D bird companion and a cozy visual environment.

Pomodoro Bird helps users work in focused intervals and take intentional breaks. The bird is the product's visual companion: it changes state during focus, breaks, completion, and rest.

### Platforms

The current MVP is a **web application**. Target platform direction (recorded for future phases — not implemented in the MVP):

- **Mobile first:** Android is the first mobile target; iOS follows second.
- **Distribution:** Google Play Store is the first distribution goal; the Apple App Store follows.
- **Identity preserved on every platform:** the app remains Pomodoro Bird, the bird remains the visual companion, and the timer remains the primary product function.

## 2. Goal and Core Purpose

The primary goal is to make focused work easier to start and sustain without adding unnecessary complexity.

### Core purpose
- Provide a reliable Pomodoro timer.
- Reduce friction between deciding to focus and actually starting.
- Make focus sessions emotionally pleasant through a consistent bird companion.
- Give users lightweight progress feedback without turning the app into a distracting game.
- Keep the interface calm, fast, accessible, and easy to understand.

## 3. Target Users

### Primary users
- Students studying independently.
- Remote workers and freelancers.
- Developers, designers, writers, and creators.
- People who want a simple focus timer without a large productivity suite.

### User needs
- Start a focus session quickly.
- Clearly see remaining time.
- Know whether the app is in focus or break mode.
- Receive a clear completion signal.
- Track completed sessions and daily streaks.
- Enjoy a motivating visual experience without distracting animations.
- Customize timer durations when the default Pomodoro cycle does not fit their workflow.

## 4. Product Principles

1. **Timer first:** The timer is always the primary interaction.
2. **Calm over noisy:** Visuals and animations should support focus.
3. **One recognizable companion:** The bird should remain visually consistent.
4. **Fast interaction:** Starting a session should require minimal interaction.
5. **Progress without pressure:** Streaks and rewards encourage consistency but should not punish missed days.
6. **Privacy by default:** The MVP should avoid collecting unnecessary personal data.

## 5. Key Features

### P0 — MVP

#### Pomodoro timer
- Default focus duration: 25 minutes.
- Default short break: 5 minutes.
- Default long break: 15 minutes.
- Start, pause, resume, skip, and reset controls.
- Automatic transition between focus and break sessions.
- Clear current-mode indicator.
- Visual progress indicator.
- Accurate countdown based on elapsed time rather than animation frames.

#### Bird companion
- Idle state.
- Focus state.
- Break state.
- Happy/completion state.
- Sleeping/rest state.
- Consistent SVG-based character.
- Subtle state animations.

#### Session tracking
- Completed Pomodoros.
- Current daily session count.
- Daily streak.
- Basic session history.

#### Environment
- One signature cozy environment for MVP.
- AI-generated/illustrated background separated from the bird asset.
- Environment must not compete visually with the timer.

#### Notifications
- In-app completion feedback.
- Optional browser notification when supported and permission is granted.
- Optional sound.

#### Settings
- Focus duration.
- Short-break duration.
- Long-break duration.
- Number of focus sessions before a long break.
- Auto-start break.
- Auto-start next focus session.
- Sound/notification preferences.

### P1 — Post-MVP

- Multiple environments.
- Bird customization.
- Nest growth/progress visualization.
- Additional decorative items.
- Themes such as morning, garden, and night.
- More detailed statistics.
- Keyboard shortcuts.
- PWA/offline support improvements.

### Focus Rewards — Gifts & Nest

- Completing a FOCUS session grants exactly one collectible gift.
- The bird visually brings the gift after the session completes.
- Gifts are nature/cozy themed.
- Gifts have Common, Uncommon, Rare, and Very Rare rarity.
- Longer focus sessions can have improved rarity odds.
- Gifts become part of the bird's nest/world.
- The complete collection is persistent.
- The visible nest has a limited display capacity to prevent clutter.
- Duplicate gifts are allowed.
- Rewards encourage consistency without punishing missed sessions.
- Rewards are secondary to the Pomodoro timer and productivity experience.

### P2 — Future

- Accounts and cloud synchronization.
- Cross-device history.
- Optional achievements.
- Additional companion characters.
- Advanced analytics.
- Carefully designed social features.

The following feature requirements are recorded here as the future **mobile/Firebase direction** (not part of the MVP). They are documented so the requirements exist in one place; they are not yet approved for implementation timing beyond what P2 — Future implies.

#### Account (future)
- Create an account.
- Sign in.
- Sign out.
- Password recovery.

#### Cloud Sync (future)
- Sync settings.
- Sync completed sessions.
- Sync statistics.
- Sync streaks.

#### Cross-device (future)
- The same account works across all supported devices (Android, iOS, web where applicable).
- Signing into the same account on another device retrieves the synced data.

#### Offline (future)
- The timer continues to work without an internet connection.
- Completed sessions are kept locally and sync when a connection returns.

#### Data (future)
- Cloud-stored data is scoped to the user's account.
- A future data export/import feature is possible.
- The export/import note: a future export/import feature does **not** replace cloud synchronization via Firebase; both may coexist. **Do not implement export/import in the MVP.**

## 6. Non-Goals

The MVP will not attempt to become:
- A full task-management platform.
- A calendar application.
- A team project-management system.
- A social network.
- A complex gamification platform.
- A marketplace for themes/assets.
- A system requiring an account before the timer can be used.

## 7. Success Criteria

The MVP is successful when:
- A user can start a focus session in a few seconds.
- The timer remains accurate when the browser tab is inactive.
- Focus/break transitions work reliably.
- The bird changes appropriately with timer state.
- Settings persist locally.
- Completed sessions and streak data survive a page reload.
- The interface works on desktop and mobile layouts.
- No critical console errors occur during normal use.

## 8. MVP Acceptance Criteria

- Timer displays correct remaining time.
- Pause/resume does not reset elapsed progress.
- Reset returns the current session to its configured duration.
- Skip moves to the correct next session.
- Long-break logic follows the configured cycle.
- Browser refresh does not corrupt stored settings or session data.
- Bird state always corresponds to the timer state.
- User can operate the main timer using keyboard controls where practical.
- Reduced-motion preferences are respected.
