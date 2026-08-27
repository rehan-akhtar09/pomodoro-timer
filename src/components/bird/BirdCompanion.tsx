import { useIdleSleepTimer } from '../../hooks/useIdleSleepTimer';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { BirdState } from './birdStates';
import { BIRD_STATES, DEFAULT_BIRD_STATE } from './birdStates';
import './BirdCompanion.css';

interface BirdCompanionProps {
    /** Which bird state to display. Defaults to `idle`. */
    state?: BirdState;
    /** Rendered size in px. The SVG scales cleanly because assets are vector. */
    size?: number;
}

/** Maps a bird state to the CSS class that drives its motion (design.md §9). */
const BIRD_MOTION_CLASS: Record<BirdState, string> = {
    idle: 'bird-companion__image--breathe',
    focus: 'bird-companion__image--breathe',
    break: 'bird-companion__image--play',
    happy: 'bird-companion__image--celebrate',
    sleeping: 'bird-companion__image--sleep',
};

/**
 * BirdCompanion — the bird mascot (Phase 2: motion + sleeping).
 *
 * The timer drives `state` through application state; this component does not
 * depend on the timer implementation. The bird falls asleep on its own after
 * 5 continuous minutes of IDLE (bird-layer-only; see useIdleSleepTimer) and
 * motion classes are removed entirely when the user prefers reduced motion.
 */
export function BirdCompanion({ state = DEFAULT_BIRD_STATE, size = 160 }: BirdCompanionProps) {
    const effectiveState = useIdleSleepTimer(state);
    const reducedMotion = usePrefersReducedMotion();
    const definition = BIRD_STATES[effectiveState];

    const motionClass = reducedMotion ? '' : BIRD_MOTION_CLASS[effectiveState];
    const imageClass = `bird-companion__image${motionClass ? ` ${motionClass}` : ''}`;

    return (
        <div
            className="bird-companion"
            style={{ width: size, height: size }}
            data-bird-state={effectiveState}
        >
            <img
                className={imageClass}
                src={definition.src}
                alt={definition.label}
                width={size}
                height={size}
                draggable={false}
            />
        </div>
    );
}
