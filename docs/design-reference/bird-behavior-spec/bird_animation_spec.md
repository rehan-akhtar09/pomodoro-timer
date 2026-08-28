# Pomodoro Bird — Behavior & Animation Specification (Web Reference)

> Reference material only — not shipped in the app build. Original package
> (`pomodoro_bird_animation_assets/`) was authored for a Flutter + Rive spec.
> This copy is re-scoped for the React web app: character animation is
> implemented with CSS/SVG (no Rive, no Flutter). The state list, transition
> rules, and named anchors below are the design contract to implement.

## Purpose

This document defines the production behavior contract for the Pomodoro Bird
in the web app.

The bird is a living companion. The Bird Behavior Controller owns the bird's
position in the environment; CSS classes/transitions drive its pose and motion
using the SVG assets under `public/assets/birds/`.

## Character animation approach (web)

- Each pose state maps to a static SVG asset (see `public/assets/birds/`).
- Motion (walk bob, hop, wing flap, land, sleep settle) is implemented with
  CSS keyframes on the rendered `<img>` element and a position-state layer
  (percentage-based movement between named anchors).
- The bird faces left/right through CSS `scaleX(-1)` rather than duplicated
  left/right art.
- Reusable motion previews: `preview/bird_walk_animated.svg` and
  `preview/bird_fly_animated.svg` are self-contained CSS-animated SVGs and
  may be used directly as WALK and FLY reference implementations.

## Required states

`IDLE`, `WAKE`, `FOCUS_CALM`, `FOCUS_ALERT`, `FOCUS_ANTICIPATION`, `WALK`,
`HOP`, `FLY`, `LAND`, `SLEEPY`, `WALK_TO_NEST`, `NEST_SETTLE`, `SLEEP`,
`WAKE_FROM_NEST`, `HAPPY`, `RECEIVE_GIFT`, `CARRY_GIFT`, `PLACE_GIFT`.

## Transition rules

- `IDLE -> WAKE` when Focus starts.
- `WAKE -> WALK` when the bird begins exploring.
- `WALK -> HOP` occasionally at a valid anchor.
- `WALK -> FLY` only for an allowed long-distance transition.
- `FLY -> LAND` at the destination anchor.
- `WALK -> SLEEPY` when long-session sleep policy is reached.
- `SLEEPY -> WALK_TO_NEST` when the nest is selected.
- `WALK_TO_NEST -> NEST_SETTLE -> SLEEP`.
- `SLEEP -> WAKE_FROM_NEST` near completion or when the session state requires waking.
- `FOCUS_CALM -> FOCUS_ALERT -> FOCUS_ANTICIPATION` near completion.
- `FOCUS_ANTICIPATION -> HAPPY` on completed Focus.
- `HAPPY -> RECEIVE_GIFT -> CARRY_GIFT -> PLACE_GIFT` after reward creation.

## Environment movement

Use named anchors rather than hard-coded pixel coordinates:

- `nest`
- `branch_left`
- `branch_right`
- `ground_left`
- `ground_center`
- `ground_right`

Anchors are percentage-based positions within the `Environment` scene (not
pixel coordinates). Movement destinations should be responsive/logical
positions.

## Gift delivery

The bird should visibly receive a gift, carry it, travel to the selected
nest/world destination, and place it.

The gift itself becomes an independent draggable environmental object after
placement.

## Reduced motion

When reduced motion is enabled, skip walking, flying, hopping and delivery
animation. Update state and destination instantly while preserving the final
visual state (matches the existing `usePrefersReducedMotion` pattern).

## Included SVGs

The SVGs in `public/assets/birds/`, `public/assets/environments/`, and
`public/assets/gifts/` are the production assets for the web implementation.
Pose SVGs are static; motion is layered on top with CSS.

## Browser animation previews

`preview/bird_walk_animated.svg` and `preview/bird_fly_animated.svg`
demonstrate the intended motion concept and are directly reusable as WALK/FLY
reference implementations in the browser.

## Acceptance criteria

- The bird never remains static for the entire active Focus session.
- Long sessions can transition to sleeping in the nest.
- Short sessions remain more active.
- Near completion produces a subtle alert/anticipation state.
- Completion produces Happy.
- Every completed Focus session produces exactly one reward.
- Gift delivery is visibly connected to the bird.
- Gifts can later be dragged and repositioned.
- No animation controls timer correctness.
