/**
 * Timer — the visually dominant countdown display.
 *
 * Shows the formatted remaining time plus a short session label. A visually
 * hidden `aria-live` region announces state transitions only (never the
 * per-tick time), so screen readers stay calm while the countdown runs.
 */

import { useRef } from 'react';
import type { SessionMode, TimerState } from '../../types/timer';
import { formatTime } from '../../utils/time';
import './Timer.css';

interface TimerProps {
    state: TimerState;
    mode: SessionMode | null;
    remainingMs: number;
}

/** Short label for the current timer state. */
function sessionLabel(state: TimerState, mode: SessionMode | null): string {
    switch (state) {
        case 'FOCUSING':
        case 'FOCUS_PAUSED':
            return 'Focus time';
        case 'SHORT_BREAK':
        case 'SHORT_BREAK_PAUSED':
            return 'Short break';
        case 'LONG_BREAK':
        case 'LONG_BREAK_PAUSED':
            return 'Long break';
        case 'COMPLETED':
            return 'Session complete';
        case 'IDLE':
        default:
            // `mode` still tells us what is queued up to run next.
            return mode === null ? 'Ready to focus' : `${sessionLabelForMode(mode)} — ready`;
    }
}

function sessionLabelForMode(mode: SessionMode): string {
    switch (mode) {
        case 'focus':
            return 'Focus time';
        case 'shortBreak':
            return 'Short break';
        case 'longBreak':
            return 'Long break';
    }
}

/** A short, calm announcement for a state transition (or null if none). */
function transitionMessage(prev: TimerState | null, next: TimerState): string | null {
    if (prev === null || prev === next) {
        return null;
    }
    switch (next) {
        case 'FOCUSING':
            return prev === 'FOCUS_PAUSED' ? 'Focus session resumed' : 'Focus session started';
        case 'FOCUS_PAUSED':
            return 'Focus session paused';
        case 'SHORT_BREAK':
            return prev === 'SHORT_BREAK_PAUSED' ? 'Short break resumed' : 'Short break started';
        case 'SHORT_BREAK_PAUSED':
            return 'Short break paused';
        case 'LONG_BREAK':
            return prev === 'LONG_BREAK_PAUSED' ? 'Long break resumed' : 'Long break started';
        case 'LONG_BREAK_PAUSED':
            return 'Long break paused';
        case 'COMPLETED':
            return 'Session complete';
        case 'IDLE':
            return 'Timer reset';
        default:
            return null;
    }
}

export function Timer({ state, mode, remainingMs }: TimerProps) {
    const prevStateRef = useRef<TimerState | null>(null);
    const message = transitionMessage(prevStateRef.current, state);
    prevStateRef.current = state;

    const label = sessionLabel(state, mode);
    const time = formatTime(remainingMs);

    return (
        <section className="timer" aria-label={`Timer: ${label}`}>
            <p className="timer__time" role="timer" aria-live="off">
                {time}
            </p>
            <p className="timer__label">{label}</p>
            <p className="visually-hidden" aria-live="polite">
                {message ?? ''}
            </p>
        </section>
    );
}
