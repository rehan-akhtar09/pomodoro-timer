import type { BirdState } from './birdStates';
import { BIRD_STATES, DEFAULT_BIRD_STATE } from './birdStates';
import './BirdCompanion.css';

interface BirdCompanionProps {
    /** Which bird state to display. Defaults to `idle`. */
    state?: BirdState;
    /** Rendered size in px. The SVG scales cleanly because assets are vector. */
    size?: number;
}

/**
 * BirdCompanion — the bird mascot.
 *
 * Phase 0 foundation: a clean, reusable state-based interface. The timer
 * controller will drive `state` later through application state; this
 * component does not depend on the timer implementation.
 */
export function BirdCompanion({ state = DEFAULT_BIRD_STATE, size = 160 }: BirdCompanionProps) {
    const definition = BIRD_STATES[state];

    return (
        <div className="bird-companion" style={{ width: size, height: size }} data-bird-state={state}>
            <img
                className="bird-companion__image"
                src={definition.src}
                alt={definition.label}
                width={size}
                height={size}
                draggable={false}
            />
        </div>
    );
}
