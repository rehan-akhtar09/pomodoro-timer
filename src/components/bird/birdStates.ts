/**
 * Bird state definitions — Pomodoro Bird.
 *
 * The BirdCompanion component renders a single SVG per state. Keeping the
 * mapping here separates presentation data from the component logic so the
 * timer layer can later drive the bird purely through the `BirdState` type.
 */

/** The visual states the bird can be in. */
export type BirdState = 'idle' | 'focus' | 'break' | 'happy' | 'sleeping';

/** Single bird state definition used by the component and tests. */
export interface BirdStateDefinition {
    /** Stable identifier, also used as the accessible label. */
    id: BirdState;
    /** Public asset path to the state's SVG. */
    src: string;
    /** Short description used for `alt` text. */
    label: string;
}

/** Public asset paths for the approved bird SVGs (public/assets/birds). */
const BIRD_ASSET_BASE = '/assets/birds';

/** Ordered, complete mapping of every bird state to its approved SVG. */
export const BIRD_STATES: Record<BirdState, BirdStateDefinition> = {
    idle: {
        id: 'idle',
        src: `${BIRD_ASSET_BASE}/bird-idle.svg`,
        label: 'Bird resting calmly',
    },
    focus: {
        id: 'focus',
        src: `${BIRD_ASSET_BASE}/bird-focus.svg`,
        label: 'Bird concentrating',
    },
    break: {
        id: 'break',
        src: `${BIRD_ASSET_BASE}/bird-break.svg`,
        label: 'Bird on a break',
    },
    happy: {
        id: 'happy',
        src: `${BIRD_ASSET_BASE}/bird-happy.svg`,
        label: 'Bird celebrating completion',
    },
    sleeping: {
        id: 'sleeping',
        src: `${BIRD_ASSET_BASE}/bird-sleeping.svg`,
        label: 'Bird sleeping',
    },
};

/** All valid bird state ids, useful for validation and tests. */
export const BIRD_STATE_IDS: BirdState[] = ['idle', 'focus', 'break', 'happy', 'sleeping'];

/**
 * Map a timer state to a bird state (architecture.md §3).
 *
 * COMPLETED maps to `happy`; sleeping is reserved for a future rest state.
 */
export function timerStateToBirdState(
    timerState: 'IDLE' | 'FOCUSING' | 'FOCUS_PAUSED' | 'SHORT_BREAK' | 'SHORT_BREAK_PAUSED' | 'LONG_BREAK' | 'COMPLETED',
): BirdState {
    switch (timerState) {
        case 'FOCUSING':
        case 'FOCUS_PAUSED':
            return 'focus';
        case 'SHORT_BREAK':
        case 'SHORT_BREAK_PAUSED':
        case 'LONG_BREAK':
            return 'break';
        case 'COMPLETED':
            return 'happy';
        case 'IDLE':
        default:
            return 'idle';
    }
}

/** Default bird state when no timer state is provided. */
export const DEFAULT_BIRD_STATE: BirdState = 'idle';
