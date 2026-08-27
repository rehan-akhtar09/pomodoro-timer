/**
 * TimerControls — Start / Pause / Resume / Reset / Skip.
 *
 * Native buttons only (keyboard operable by default) with visible labels.
 * The primary action is visually distinct from the secondary ones; Reset and
 * Skip are secondary and never styled like the primary action.
 */

import type { TimerState } from '../../types/timer';
import './TimerControls.css';

interface TimerControlsProps {
    state: TimerState;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onReset: () => void;
    onSkip: () => void;
}

export function TimerControls({ state, onStart, onPause, onResume, onReset, onSkip }: TimerControlsProps) {
    const isIdle = state === 'IDLE';
    const isCompleted = state === 'COMPLETED';
    const isPaused =
        state === 'FOCUS_PAUSED' || state === 'SHORT_BREAK_PAUSED' || state === 'LONG_BREAK_PAUSED';
    const isRunning =
        state === 'FOCUSING' || state === 'SHORT_BREAK' || state === 'LONG_BREAK';

    const primaryLabel = isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start';
    const onPrimary = isRunning ? onPause : isPaused ? onResume : onStart;

    return (
        <div className="timer-controls">
            <button
                type="button"
                className="timer-controls__primary"
                onClick={onPrimary}
                aria-label={isCompleted ? 'Start next session' : primaryLabel}
            >
                {primaryLabel}
            </button>

            <button
                type="button"
                className="timer-controls__secondary"
                onClick={onReset}
                disabled={isIdle}
                aria-label="Reset timer"
            >
                Reset
            </button>

            {!isIdle && !isCompleted && (
                <button
                    type="button"
                    className="timer-controls__secondary"
                    onClick={onSkip}
                    aria-label="Skip to next session"
                >
                    Skip
                </button>
            )}
        </div>
    );
}
