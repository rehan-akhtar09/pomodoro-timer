/**
 * TimerProgress — subtle circular progress ring.
 *
 * Progress is derived from `remainingMs / durationMs` (never color alone), so
 * status is communicated independently of color for accessibility. The ring is
 * exposed to assistive tech via the `progressbar` role.
 */

import type { SessionMode, TimerState } from '../../types/timer';
import { formatTime } from '../../utils/time';
import './TimerProgress.css';

interface TimerProgressProps {
    state: TimerState;
    mode: SessionMode | null;
    remainingMs: number;
    durationMs: number;
}

const RING_SIZE = 180;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Fraction of the session already elapsed, clamped to 0..1. */
function elapsedFraction(remainingMs: number, durationMs: number): number {
    if (durationMs <= 0) {
        return 0;
    }
    return Math.min(1, Math.max(0, 1 - remainingMs / durationMs));
}

function progressLabel(mode: SessionMode | null): string {
    switch (mode) {
        case 'focus':
            return 'Focus progress';
        case 'shortBreak':
            return 'Short break progress';
        case 'longBreak':
            return 'Long break progress';
        default:
            return 'Session progress';
    }
}

export function TimerProgress({ state, mode, remainingMs, durationMs }: TimerProgressProps) {
    const fraction = state === 'IDLE' ? 0 : elapsedFraction(remainingMs, durationMs);
    const percent = Math.round(fraction * 100);
    const dashOffset = CIRCUMFERENCE * (1 - fraction);

    return (
        <div className="timer-progress">
            <svg
                className="timer-progress__ring"
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                role="progressbar"
                aria-label={progressLabel(mode)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={`${formatTime(remainingMs)} remaining`}
            >
                <circle
                    className="timer-progress__track"
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE}
                />
                <circle
                    className="timer-progress__bar"
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
