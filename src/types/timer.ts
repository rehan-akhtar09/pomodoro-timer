/**
 * Timer and session types — Pomodoro Bird.
 *
 * These types prepare the architecture for the Phase 1 timer engine.
 * They are intentionally independent from any UI so the engine can be
 * tested and reused without React.
 */

/** Session mode of the Pomodoro cycle. */
export type SessionMode = 'focus' | 'shortBreak' | 'longBreak';

/**
 * Timer state machine states (architecture.md §3).
 *
 * IDLE                — nothing running, ready to start.
 * FOCUSING            — focus session running.
 * FOCUS_PAUSED        — focus session paused.
 * SHORT_BREAK         — short break running.
 * SHORT_BREAK_PAUSED  — short break paused.
 * LONG_BREAK          — long break running.
 * LONG_BREAK_PAUSED   — long break paused.
 * COMPLETED           — a session just finished (transient).
 */
export type TimerState =
    | 'IDLE'
    | 'FOCUSING'
    | 'FOCUS_PAUSED'
    | 'SHORT_BREAK'
    | 'SHORT_BREAK_PAUSED'
    | 'LONG_BREAK'
    | 'LONG_BREAK_PAUSED'
    | 'COMPLETED';

/** User-configurable durations, in seconds. */
export interface TimerSettings {
    focusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    autoStartBreaks: boolean;
    autoStartFocus: boolean;
}

/** A running or paused session snapshot. */
export interface ActiveSession {
    mode: SessionMode;
    /** Unix epoch ms when the running phase started. */
    startedAt: number;
    /** Total elapsed active ms (accumulated across resume cycles). */
    elapsedMs: number;
    /** Configured total duration of this session in ms. */
    durationMs: number;
    /** Number of completed focus sessions in the current cycle. */
    completedFocusInCycle: number;
}

/** Default in-memory settings used by the MVP until the Phase 4 settings UI. */
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
    focusDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

/**
 * Payload emitted when a session ends (architecture.md §4 — completion event).
 *
 * `nextMode` is the session that runs next: either started automatically, or
 * pending while the timer sits in COMPLETED waiting for the user. The count is
 * the value that takes effect for the next session (already incremented for a
 * completed focus session, or reset to 0 after a long break).
 */
export interface SessionCompletionPayload {
    /** The session that just finished. */
    mode: SessionMode;
    /** Completed focus sessions in the cycle that applies to the next session. */
    completedFocusInCycle: number;
    /** The session that comes next in the cycle. */
    nextMode: SessionMode;
}

/**
 * Events the timer engine emits so the UI/store can react without coupling the
 * engine to presentation (architecture.md §4 step 6).
 */
export type TimerEngineEvent = { type: 'SESSION_COMPLETED'; payload: SessionCompletionPayload };

/**
 * Convenience helpers for the timer layer (Phase 1 will use these).
 */

/** Duration of a session mode based on settings. */
export function durationForMode(mode: SessionMode, settings: TimerSettings): number {
    switch (mode) {
        case 'focus':
            return settings.focusDuration;
        case 'shortBreak':
            return settings.shortBreakDuration;
        case 'longBreak':
            return settings.longBreakDuration;
    }
}

/** Whether a timer state represents a break. */
export function isBreakState(state: TimerState): boolean {
    return (
        state === 'SHORT_BREAK' ||
        state === 'SHORT_BREAK_PAUSED' ||
        state === 'LONG_BREAK' ||
        state === 'LONG_BREAK_PAUSED'
    );
}

/** Whether a timer state represents a focus phase. */
export function isFocusState(state: TimerState): boolean {
    return state === 'FOCUSING' || state === 'FOCUS_PAUSED';
}
