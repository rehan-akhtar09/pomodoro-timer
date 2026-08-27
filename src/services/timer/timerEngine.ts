/**
 * Pomodoro timer engine — Pomodoro Bird.
 *
 * Pure, framework-independent session logic (architecture.md §3 — Timer Engine).
 * Remaining time is always derived from timestamps, never from decrementing a
 * counter per tick (rules.md §2 — avoid fragile timer logic):
 *
 *     remaining = targetEndTime - currentTime
 *
 * Every function takes `now` as an explicit argument so tests can control time
 * without mocks. All state transitions route through the single pure function
 * `nextState`.
 */

import {
    durationForMode,
    isBreakState,
    isFocusState,
    type SessionMode,
    type TimerEngineEvent,
    type TimerSettings,
    type TimerState,
} from '../../types/timer';

/** A snapshot of the timer/session engine. */
export interface TimerEngineState {
    state: TimerState;
    /**
     * Current session mode. While in COMPLETED this holds the *next* pending
     * session mode so a follow-up START/SKIP can continue the cycle.
     */
    mode: SessionMode | null;
    /** Absolute end timestamp (ms) while running; null when idle/paused/complete. */
    targetEndTime: number | null;
    /** Frozen remaining ms (used while paused; full duration when idle). */
    remainingMs: number;
    /** Total configured duration of the current session in ms. */
    durationMs: number;
    /** Completed focus sessions in the current cycle (0..sessionsBeforeLongBreak). */
    completedFocusInCycle: number;
}

/** User-initiated actions the engine accepts. */
export type TimerEngineAction =
    | { type: 'START' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'RESET' }
    | { type: 'SKIP' }
    | { type: 'COMPLETE' };

/**
 * Extra context the pure transition function needs to make decisions.
 *
 * Contract: `completedFocusInCycle` is the number of focus sessions completed
 * in the current cycle *before* the action's effect. When a focus session ends
 * (SKIP/COMPLETE) the effective count for deciding the next break is therefore
 * `completedFocusInCycle + 1`.
 */
export interface TransitionContext {
    settings: TimerSettings;
    completedFocusInCycle: number;
    mode: SessionMode | null;
}

/** Result of applying an action: the new snapshot plus any emitted events. */
export interface EngineResult {
    state: TimerEngineState;
    events: TimerEngineEvent[];
}

/** Fresh IDLE snapshot ready for the first focus session. */
export function createInitialState(settings: TimerSettings): TimerEngineState {
    const durationMs = durationForMode('focus', settings) * 1000;
    return {
        state: 'IDLE',
        mode: null,
        targetEndTime: null,
        remainingMs: durationMs,
        durationMs,
        completedFocusInCycle: 0,
    };
}

/** Whether a timer state is a running (non-paused, non-idle) session. */
export function isRunningState(state: TimerState): boolean {
    return state === 'FOCUSING' || state === 'SHORT_BREAK' || state === 'LONG_BREAK';
}

/** Timestamp-derived remaining time in ms (clamped at 0). */
export function getRemainingMs(state: TimerEngineState, now: number): number {
    if (state.targetEndTime === null) {
        return state.remainingMs;
    }
    return Math.max(0, state.targetEndTime - now);
}

function runningStateNameForMode(mode: SessionMode): TimerState {
    switch (mode) {
        case 'focus':
            return 'FOCUSING';
        case 'shortBreak':
            return 'SHORT_BREAK';
        case 'longBreak':
            return 'LONG_BREAK';
    }
}

function makeRunning(
    mode: SessionMode,
    completedFocusInCycle: number,
    now: number,
    settings: TimerSettings,
): TimerEngineState {
    const durationMs = durationForMode(mode, settings) * 1000;
    return {
        state: runningStateNameForMode(mode),
        mode,
        targetEndTime: now + durationMs,
        remainingMs: durationMs,
        durationMs,
        completedFocusInCycle,
    };
}

/**
 * The session that runs after `completedMode` finishes.
 *
 * `completedCount` is the effective post-completion focus count (already
 * incremented for a completed focus session, or 0 after a long break).
 */
function nextModeAfter(completedMode: SessionMode | null, completedCount: number, settings: TimerSettings): SessionMode {
    if (completedMode === 'focus') {
        return completedCount >= settings.sessionsBeforeLongBreak ? 'longBreak' : 'shortBreak';
    }
    return 'focus';
}

/**
 * Build the engine snapshot that results from a session ending.
 *
 * `nextStateName` is the state chosen by `nextState` (one of COMPLETED,
 * FOCUSING, SHORT_BREAK, LONG_BREAK); `nextCount` is the post-action cycle count.
 */
function endSession(
    prev: TimerEngineState,
    nextStateName: TimerState,
    nextCount: number,
    now: number,
    settings: TimerSettings,
): TimerEngineState {
    if (nextStateName === 'COMPLETED') {
        // Stay in COMPLETED (transient) with the next session pending.
        return {
            state: 'COMPLETED',
            mode: nextModeAfter(prev.mode, nextCount, settings),
            targetEndTime: null,
            remainingMs: 0,
            durationMs: prev.durationMs,
            completedFocusInCycle: nextCount,
        };
    }
    if (nextStateName === 'FOCUSING') {
        return makeRunning('focus', nextCount, now, settings);
    }
    return makeRunning(nextStateName === 'LONG_BREAK' ? 'longBreak' : 'shortBreak', nextCount, now, settings);
}

/**
 * The single, explicit state transition function (architecture.md §3 —
 * Session State Machine). Returns the next TimerState for an action; it never
 * mutates anything and relies on `context` for cycle/auto-start decisions.
 *
 * Contract: `context.completedFocusInCycle` is the pre-action focus count, so
 * a focus session ending here is counted as `completedFocusInCycle + 1`.
 */
export function nextState(current: TimerState, action: TimerEngineAction, context: TransitionContext): TimerState {
    const { settings, completedFocusInCycle, mode } = context;
    switch (action.type) {
        case 'START': {
            if (current === 'IDLE') return 'FOCUSING';
            if (current === 'COMPLETED') return runningStateNameForMode(mode ?? 'focus');
            return current;
        }
        case 'PAUSE': {
            switch (current) {
                case 'FOCUSING':
                    return 'FOCUS_PAUSED';
                case 'SHORT_BREAK':
                    return 'SHORT_BREAK_PAUSED';
                case 'LONG_BREAK':
                    return 'LONG_BREAK_PAUSED';
                default:
                    return current;
            }
        }
        case 'RESUME': {
            switch (current) {
                case 'FOCUS_PAUSED':
                    return 'FOCUSING';
                case 'SHORT_BREAK_PAUSED':
                    return 'SHORT_BREAK';
                case 'LONG_BREAK_PAUSED':
                    return 'LONG_BREAK';
                default:
                    return current;
            }
        }
        case 'RESET':
            return 'IDLE';
        case 'SKIP': {
            // Skipping is an explicit "move on now" action: it jumps straight
            // into the next session regardless of the auto-start flags.
            if (current === 'IDLE') return 'IDLE';
            if (current === 'COMPLETED') return runningStateNameForMode(mode ?? 'focus');
            if (isFocusState(current)) {
                return completedFocusInCycle + 1 >= settings.sessionsBeforeLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK';
            }
            if (isBreakState(current)) return 'FOCUSING';
            return current;
        }
        case 'COMPLETE': {
            // Natural completion: pass through COMPLETED unless auto-start is on.
            if (isFocusState(current)) {
                const nextIsLongBreak = completedFocusInCycle + 1 >= settings.sessionsBeforeLongBreak;
                if (!settings.autoStartBreaks) return 'COMPLETED';
                return nextIsLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK';
            }
            if (isBreakState(current)) {
                return settings.autoStartFocus ? 'FOCUSING' : 'COMPLETED';
            }
            return current;
        }
        default:
            return current;
    }
}

/**
 * Apply an action to the current snapshot. Pure: returns a new snapshot and
 * any events; the caller decides what to do with them (the hook updates React
 * state; future phases may also persist stats/notifications).
 */
export function applyAction(
    prev: TimerEngineState,
    action: TimerEngineAction,
    settings: TimerSettings,
    now: number,
): EngineResult {
    const context: TransitionContext = {
        settings,
        completedFocusInCycle: prev.completedFocusInCycle,
        mode: prev.mode,
    };

    // A session ending (naturally or skipped) changes the cycle count.
    const isEnding = action.type === 'COMPLETE' || action.type === 'SKIP';
    const focusEnding = isEnding && isFocusState(prev.state);
    const longBreakEnding = isEnding && prev.mode === 'longBreak' && isBreakState(prev.state);

    // Effective post-action focus count.
    let nextCount = prev.completedFocusInCycle;
    if (focusEnding) {
        nextCount += 1;
    }
    if (longBreakEnding) {
        nextCount = 0;
    }

    const next = nextState(prev.state, action, context);
    const events: TimerEngineEvent[] = [];

    switch (action.type) {
        case 'START': {
            if (prev.state !== 'IDLE' && prev.state !== 'COMPLETED') {
                return { state: prev, events };
            }
            const mode: SessionMode = prev.state === 'COMPLETED' ? (prev.mode ?? 'focus') : 'focus';
            return { state: makeRunning(mode, prev.completedFocusInCycle, now, settings), events };
        }
        case 'PAUSE': {
            if (prev.targetEndTime === null) {
                return { state: prev, events };
            }
            const remainingMs = Math.max(0, prev.targetEndTime - now);
            return { state: { ...prev, state: next, targetEndTime: null, remainingMs }, events };
        }
        case 'RESUME': {
            if (next === prev.state) {
                return { state: prev, events };
            }
            return { state: { ...prev, state: next, targetEndTime: now + prev.remainingMs }, events };
        }
        case 'RESET':
            return { state: createInitialState(settings), events };
        case 'SKIP': {
            // No-op for transitions that stay in the same state (e.g. IDLE).
            if (next === prev.state) {
                return { state: prev, events };
            }
            return { state: endSession(prev, next, nextCount, now, settings), events };
        }
        case 'COMPLETE': {
            if (prev.mode !== null) {
                events.push({
                    type: 'SESSION_COMPLETED',
                    payload: {
                        mode: prev.mode,
                        completedFocusInCycle: nextCount,
                        nextMode: nextModeAfter(prev.mode, nextCount, settings),
                    },
                });
            }
            return { state: endSession(prev, next, nextCount, now, settings), events };
        }
        default:
            return { state: prev, events };
    }
}
