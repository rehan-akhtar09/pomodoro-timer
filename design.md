# UI/UX and Visual Design System — Pomodoro Bird

## 1. Design Vision

Pomodoro Bird should feel:

- Calm.
- Cozy.
- Friendly.
- Focused.
- Modern.
- Lightweight.
- Slightly playful without feeling childish.

The visual experience should make the user want to stay on the page during a focus session.

## 2. Core UX Principle

The timer is the hero.

The bird and environment create emotional connection, but they must never compete with:
1. Remaining time.
2. Current session type.
3. Primary timer controls.

## 3. Layout

Recommended desktop structure:

```text
┌──────────────────────────────────────────────┐
│                    Header                    │
├──────────────────────────────────────────────┤
│                                              │
│          Environment / Bird Scene             │
│                                              │
│                25:00                         │
│             FOCUS TIME                       │
│                                              │
│          [ Start ] [ Reset ]                 │
│                                              │
│      Sessions: 3       Streak: 4             │
│                                              │
└──────────────────────────────────────────────┘
```

On mobile:
- Keep the timer prominent.
- Reduce decorative elements.
- Keep primary controls within thumb reach.
- Avoid overcrowding the scene.

## 4. Color System

Use a soft, natural palette.

Suggested tokens:

```css
--color-background: #F7F3EA;
--color-surface: #FFFDF8;
--color-text: #263238;
--color-muted: #6F7B7D;
--color-primary: #78C6C8;
--color-primary-dark: #55AEB5;
--color-accent: #F3B45B;
--color-success: #79B77A;
--color-border: #E4DED1;
```

These are starting tokens, not mandatory final values. Keep the palette limited.

## 5. Typography

Use a clean, friendly sans-serif.

Hierarchy:
- App title: medium/bold.
- Timer: very large and highly legible.
- Session label: medium.
- Controls: medium.
- Supporting text: small/medium.

The timer should use tabular or numerically stable digits where available to prevent visual jumping.

## 6. Timer Design

### Primary timer
- Large.
- High contrast.
- Centered or visually dominant.
- Clearly separated from decorative elements.

### Progress
Use a subtle circular or linear progress indicator.

Avoid overly complex charts in the main focus view.

### Controls
Primary:
- Start / Resume.

Secondary:
- Pause.
- Reset.
- Skip.

Dangerous/destructive actions should not be visually confused with the primary action.

## 7. Bird Design

The bird is a consistent 2D mascot.

States:
- Idle.
- Focus.
- Break.
- Happy.
- Sleeping.

Rules:
- Keep proportions consistent.
- Do not distort the bird during animation.
- Use subtle movement.
- Do not make the bird constantly move during deep focus.
- Preserve the same visual language across future bird states.

## 8. Environment Design

The MVP environment should be a cozy workspace.

Recommended elements:
- Soft wall/background.
- Small desk.
- Book or notebook.
- Plant.
- Window/light source.
- Bird perch or nest.
- Minimal decorative objects.

Avoid:
- Busy patterns.
- Strong visual noise.
- Rapid animations.
- Excessive text inside artwork.
- Elements that look like functional controls but are not interactive.

Environment assets should be separated from the bird so the bird can be reused.

## 9. Motion

Animation should be purposeful.

### Focus
- Slow breathing/blinking.
- Very subtle environmental movement.

### Break
- Bird can stretch/fly.
- Slightly more playful movement.

### Completion
- Short celebratory animation.

### Accessibility
When `prefers-reduced-motion: reduce` is enabled:
- Disable non-essential animations.
- Keep only necessary state changes.
- Never rely on animation to communicate timer state.

## 10. Interaction

Every primary action should have:
- Visible hover state.
- Visible focus state.
- Press/active feedback.
- Accessible label.

Avoid controls that rely only on icons unless the icon meaning is universally clear and an accessible label is provided.

## 11. Responsive Design

Breakpoints should be based on content rather than device names.

The app must remain usable at:
- Small mobile widths.
- Large mobile widths.
- Tablet widths.
- Desktop widths.

The timer should never become too small to read.

### Mobile-specific requirements (future mobile phase, Android first / iOS second)

- **Touch-friendly controls:** primary controls must be comfortably tappable (recommended minimum touch-target size) and reachable with a thumb.
- **Android/iOS screen sizes:** the design must hold up across common Android and iOS screen sizes and aspect ratios, from small phones to large tablets.
- **Safe-area support:** respect notches, rounded corners, and system UI insets (safe areas) on both Android and iOS so content is never clipped or hidden.

The visual identity (Calm, Cozy, Friendly, Modern, Focused) and the bird as the visual companion are preserved on mobile — mobile does not change the product personality.

## 12. Accessibility

Target WCAG-friendly practices:
- Strong text contrast.
- Keyboard navigation.
- Focus indicators.
- Semantic buttons.
- Screen-reader-friendly status.
- Reduced-motion support.
- Color-independent status communication.

## 13. Empty/Error States

Errors should feel calm and actionable.

Example:
> “We couldn't save your settings. Your timer will keep working, but changes may not persist.”

Avoid technical stack traces in the interface.

### Additional states to design (future account/mobile phases)

Recorded for future phases — not part of the MVP UI.

- **Authentication screens:** calm, simple sign-in/sign-up with clear feedback.
- **Loading states:** visible, non-blocking loading indicators during async operations.
- **Offline state:** the timer keeps working offline; show a calm, non-alarming offline indicator and explain that data will sync when the connection returns.
- **Syncing state:** a subtle indicator while data syncs to the cloud.
- **Authentication errors:** friendly messages for failed sign-in, sign-up, and password recovery (never raw exceptions).
- **Network errors:** friendly messages that do not interrupt the timer.
- **Empty session history:** a calm empty state (e.g., “No sessions yet”) rather than a blank screen.
- **First-time user state:** gentle onboarding that introduces the timer and the bird without requiring an account.

All of these states keep the product voice short, encouraging, and calm (see §15 Product Personality), and the bird remains the visual companion throughout.

## 14. Design Asset Rules

- Bird: SVG.
- Small reusable vector decorations: SVG.
- Large illustrated environments: optimized raster/WebP or another suitable compressed format.
- Keep source assets organized.
- Do not embed unnecessary metadata in production assets.

## 15. Product Personality

The product voice should be:
- Short.
- Encouraging.
- Calm.
- Never guilt-based.

Good:
> “Nice focus. Take a short break.”

Avoid:
> “You failed your streak!”

The app should encourage returning to focus rather than punish missed sessions.

## 16. Reward System (Gifts & Nest)

- Gifts are small, calm vector objects consistent with the existing cozy
  palette (design.md §4) — not bright, cartoonish, or attention-grabbing.
- Gifts accumulate in the nest/world area without creating visual
  clutter (design.md §8's "avoid busy patterns / visual noise" applies
  here too).
- Gift delivery is a short, non-distracting motion, similar in spirit to
  the existing completion animation (design.md §9).
- No guilt-based framing for missed or skipped sessions — the reward
  system only ever adds, never removes or visibly "punishes" (consistent
  with §15 Product Personality).
- Exactly one normal gift is awarded per completed FOCUS session.
- Longer sessions may visually communicate improved reward rarity, but
  the reward presentation must remain calm and non-gambling-like.
- The reward reveal must never obscure the primary timer for an extended
  period.
- The nest should display no more than 12 visible gift items at once.
- Items outside the visible nest display remain safely stored in the
  collection.
- Duplicate gifts are allowed and should be represented naturally.
- Gift rarity should be communicated subtly rather than through flashy
  effects.
- Reduced-motion users receive the reward immediately without delivery
  animation.
- Reward UI must remain accessible and understandable without relying
  solely on color, animation, or sound.
