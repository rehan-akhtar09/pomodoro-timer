# Implementation Checklist

Reference checklist for Phase 5B (Bird Behavior & Movement). Original
package targeted a Flutter + Rive build; items below are re-scoped for the
React web implementation (CSS/SVG, no Rive, no Flutter).

1. Import/keep these assets under `public/assets/` according to the project's
   existing asset rules (birds/environments/gifts subfolders, hyphenated
   names).
2. Extend `src/components/bird/birdStates.ts` with the new pose states without
   removing or breaking the existing 5-state mapping used elsewhere.
3. Implement environment anchors as percentage-based positions within the
   existing `Environment` scene.
4. Implement a Bird Behavior Controller separate from the Timer Engine.
5. Connect timer session state to bird behavior without allowing the bird to
   mutate TimerState.
6. Implement short-session and long-session policies.
7. Implement nest entry/sleep/wake.
8. Implement near-completion alert/anticipation.
9. Implement reward delivery and gift carrying, wired into the existing
   Phase 4B reward-completion flow.
10. Implement draggable gift placement using normalized coordinates.
11. Persist gift positions through the existing Storage Service.
12. Test reduced motion, reload persistence, completion exactly-once behavior,
    and small-screen layout.
