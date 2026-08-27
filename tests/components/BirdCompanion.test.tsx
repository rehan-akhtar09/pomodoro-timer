import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BirdCompanion } from '../../src/components/bird/BirdCompanion';
import {
    BIRD_STATES,
    BIRD_STATE_IDS,
    timerStateToBirdState,
} from '../../src/components/bird/birdStates';
import { IDLE_SLEEP_TIMEOUT_MS } from '../../src/hooks/useIdleSleepTimer';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Stub `window.matchMedia` so the reduced-motion hook reads a known value. */
function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
            matches: query === REDUCED_MOTION_QUERY ? matches : false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    });
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('BirdCompanion', () => {
    it('renders the idle state by default', () => {
        render(<BirdCompanion />);

        const image = screen.getByRole('img', { name: BIRD_STATES.idle.label });
        expect(image).toHaveAttribute('src', BIRD_STATES.idle.src);
        expect(image).toHaveAttribute('alt', BIRD_STATES.idle.label);
    });

    it.each(BIRD_STATE_IDS)('renders the %s state SVG', (state) => {
        render(<BirdCompanion state={state} />);

        const image = screen.getByRole('img', { name: BIRD_STATES[state].label });
        expect(image).toHaveAttribute('src', BIRD_STATES[state].src);
        expect(image).toHaveAttribute('alt', BIRD_STATES[state].label);
    });

    it('marks the rendered state on the wrapper for styling', () => {
        render(<BirdCompanion state="happy" />);

        expect(document.querySelector('[data-bird-state="happy"]')).toBeInTheDocument();
    });

    it('marks the sleeping state on the wrapper when the timer has been idle long enough', () => {
        vi.useFakeTimers();
        render(<BirdCompanion state="idle" />);

        expect(document.querySelector('[data-bird-state="idle"]')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(IDLE_SLEEP_TIMEOUT_MS);
        });

        expect(document.querySelector('[data-bird-state="sleeping"]')).toBeInTheDocument();
        expect(document.querySelector('[data-bird-state="idle"]')).not.toBeInTheDocument();
    });

    it('wakes the bird when the timer leaves idle before the sleep threshold', () => {
        vi.useFakeTimers();
        const { rerender } = render(<BirdCompanion state="idle" />);

        act(() => {
            vi.advanceTimersByTime(IDLE_SLEEP_TIMEOUT_MS / 2);
        });
        rerender(<BirdCompanion state="focus" />);
        act(() => {
            vi.advanceTimersByTime(IDLE_SLEEP_TIMEOUT_MS);
        });

        expect(document.querySelector('[data-bird-state="focus"]')).toBeInTheDocument();
        expect(document.querySelector('[data-bird-state="sleeping"]')).not.toBeInTheDocument();
    });

    it('applies the breathing motion class for idle and focus', () => {
        for (const state of ['idle', 'focus'] as const) {
            const { unmount } = render(<BirdCompanion state={state} />);

            expect(screen.getByRole('img')).toHaveClass('bird-companion__image--breathe');
            unmount();
        }
    });

    it('applies the playful motion class for break', () => {
        render(<BirdCompanion state="break" />);

        expect(screen.getByRole('img')).toHaveClass('bird-companion__image--play');
    });

    it('applies the celebration motion class for happy', () => {
        render(<BirdCompanion state="happy" />);

        expect(screen.getByRole('img')).toHaveClass('bird-companion__image--celebrate');
    });

    it('applies the sleep motion class when the bird is sleeping', () => {
        vi.useFakeTimers();
        render(<BirdCompanion state="idle" />);
        act(() => {
            vi.advanceTimersByTime(IDLE_SLEEP_TIMEOUT_MS);
        });

        expect(screen.getByRole('img')).toHaveClass('bird-companion__image--sleep');
    });

    it('removes all motion classes when the user prefers reduced motion', () => {
        mockMatchMedia(true);
        for (const state of BIRD_STATE_IDS) {
            const { unmount } = render(<BirdCompanion state={state} />);

            const image = screen.getByRole('img');
            expect(image).not.toHaveClass('bird-companion__image--breathe');
            expect(image).not.toHaveClass('bird-companion__image--play');
            expect(image).not.toHaveClass('bird-companion__image--celebrate');
            expect(image).not.toHaveClass('bird-companion__image--sleep');
            unmount();
        }
    });
});

describe('bird state mapping (timer -> bird)', () => {
    it('maps IDLE to idle', () => {
        expect(timerStateToBirdState('IDLE')).toBe('idle');
    });

    it('maps focus states to focus', () => {
        expect(timerStateToBirdState('FOCUSING')).toBe('focus');
        expect(timerStateToBirdState('FOCUS_PAUSED')).toBe('focus');
    });

    it('maps break states to break', () => {
        expect(timerStateToBirdState('SHORT_BREAK')).toBe('break');
        expect(timerStateToBirdState('SHORT_BREAK_PAUSED')).toBe('break');
        expect(timerStateToBirdState('LONG_BREAK')).toBe('break');
        expect(timerStateToBirdState('LONG_BREAK_PAUSED')).toBe('break');
    });

    it('maps COMPLETED to happy', () => {
        expect(timerStateToBirdState('COMPLETED')).toBe('happy');
    });

    it('timerStateToBirdState never returns sleeping (sleeping is bird-layer-only)', () => {
        for (const timerState of [
            'IDLE',
            'FOCUSING',
            'FOCUS_PAUSED',
            'SHORT_BREAK',
            'SHORT_BREAK_PAUSED',
            'LONG_BREAK',
            'LONG_BREAK_PAUSED',
            'COMPLETED',
        ] as const) {
            expect(timerStateToBirdState(timerState)).not.toBe('sleeping');
        }
    });
});

describe('bird state definitions', () => {
    it('exposes exactly the five approved states with valid asset paths', () => {
        expect(BIRD_STATE_IDS).toHaveLength(5);

        for (const state of BIRD_STATE_IDS) {
            const definition = BIRD_STATES[state];
            expect(definition.src).toMatch(/^\/assets\/birds\/bird-[a-z]+\.svg$/);
            expect(definition.label.length).toBeGreaterThan(0);
        }
    });
});
