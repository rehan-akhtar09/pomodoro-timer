/**
 * usePomodoro — React binding around the timer engine.
 *
 * The engine is pure and timestamp-based; this hook owns the ticking that
 * keeps the UI fresh. Because remaining time is always derived from
 * `targetEndTime - Date.now()`, the countdown self-corrects when the browser
 * throttles background tabs: a missed tick never causes drift.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DEFAULT_TIMER_SETTINGS,
    type SessionCompletionPayload,
    type SessionMode,
    type TimerSettings,
    type TimerState,
} from '../types/timer';
import {
    applyAction,
    createInitialState,
    getRemainingMs,
    type TimerEngineState,
} from '../services/timer/timerEngine';

/** Tick interval in ms — between the 250–1000ms window required by Phase 1. */
const TICK_INTERVAL_MS = 500;

/** Reactive snapshot the UI subscribes to (mirrors the engine state). */
export interface PomodoroSnapshot {
    state: TimerState;
    mode: SessionMode | null;
    /** Raw remaining ms (paused value or timestamp-derived while running). */
    remainingMs: number;
    /** Total configured duration of the current session in ms. */
    durationMs: number;
    /** Completed focus sessions in the current cycle. */
    completedFocusInCycle: number;
}

/** Controller actions exposed to the UI. */
export interface PomodoroActions {
    start: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    skip: () => void;
}

function toSnapshot(engine: TimerEngineState, now: number): PomodoroSnapshot {
    return {
        state: engine.state,
        mode: engine.mode,
        remainingMs: getRemainingMs(engine, now),
        durationMs: engine.durationMs,
        completedFocusInCycle: engine.completedFocusInCycle,
    };
}

/**
 * Session completion event delivered to subscribers (Phase 4 stats; the Phase
 * 4B reward service will reuse the same callback). Extends the engine's
 * payload with the configured duration of the session that just finished.
 */
export interface SessionCompletionEvent extends SessionCompletionPayload {
    /** Configured duration of the completed session in ms. */
    durationMs: number;
}

/**
 * Drive the timer engine from React.
 *
 * @param settings Timer settings (defaults to the MVP in-memory defaults).
 * @param onSessionComplete Optional subscriber called once per naturally
 *   completed session (never for skipped sessions). Stored in a ref so the
 *   tick loop stays stable. This is the Phase 4 extension point.
 */
export function usePomodoro(
    settings: TimerSettings = DEFAULT_TIMER_SETTINGS,
    onSessionComplete?: (event: SessionCompletionEvent) => void,
): PomodoroSnapshot & PomodoroActions {
    // Mutable engine state kept in a ref so the interval always reads the
    // latest values without re-creating the interval on every render. The
    // lazy-ref pattern initializes the engine exactly once per mount.
    const initialEngineRef = useRef<TimerEngineState | null>(null);
    if (initialEngineRef.current === null) {
        initialEngineRef.current = createInitialState(settings);
    }

    const engineRef = useRef<TimerEngineState>(initialEngineRef.current);
    const settingsRef = useRef(settings);
    const onSessionCompleteRef = useRef(onSessionComplete);
    const lastSnapshotRef = useRef<PomodoroSnapshot>(toSnapshot(engineRef.current, Date.now()));

    // Initialize React state from the same initial snapshot.
    const [snapshot, setSnapshot] = useState<PomodoroSnapshot>(lastSnapshotRef.current);

    // Keep the latest settings and completion subscriber available to the
    // interval callback.
    settingsRef.current = settings;
    onSessionCompleteRef.current = onSessionComplete;

    /** Apply an engine result, refresh the snapshot, and record it for the tick loop. */
    const dispatch = useCallback((engine: TimerEngineState): PomodoroSnapshot => {
        const now = Date.now();
        engineRef.current = engine;
        const next = toSnapshot(engine, now);
        lastSnapshotRef.current = next;
        setSnapshot(next);
        return next;
    }, []);

    const start = useCallback(() => {
        dispatch(applyAction(engineRef.current, { type: 'START' }, settingsRef.current, Date.now()).state);
    }, [dispatch]);

    const pause = useCallback(() => {
        dispatch(applyAction(engineRef.current, { type: 'PAUSE' }, settingsRef.current, Date.now()).state);
    }, [dispatch]);

    const resume = useCallback(() => {
        dispatch(applyAction(engineRef.current, { type: 'RESUME' }, settingsRef.current, Date.now()).state);
    }, [dispatch]);

    const reset = useCallback(() => {
        dispatch(applyAction(engineRef.current, { type: 'RESET' }, settingsRef.current, Date.now()).state);
    }, [dispatch]);

    const skip = useCallback(() => {
        dispatch(applyAction(engineRef.current, { type: 'SKIP' }, settingsRef.current, Date.now()).state);
    }, [dispatch]);

    // Tick loop: recompute remaining from timestamps and auto-complete sessions.
    // Created once; all mutable reads go through refs so the interval stays
    // stable and the countdown is immune to throttling (timestamp-derived).
    useEffect(() => {
        const timerId = window.setInterval(() => {
            const now = Date.now();
            let engine = engineRef.current;

            // A running session whose target time has passed finishes now. The
            // engine decides the next state (COMPLETED or auto-started session).
            if (engine.targetEndTime !== null && engine.targetEndTime <= now) {
                const completedDurationMs = engine.durationMs;
                const result = applyAction(engine, { type: 'COMPLETE' }, settingsRef.current, now);
                engine = result.state;
                // Fan out completion events (Phase 4 stats; Phase 4B rewards).
                // Skipped sessions never emit events, so they are never recorded.
                for (const event of result.events) {
                    if (event.type === 'SESSION_COMPLETED') {
                        onSessionCompleteRef.current?.({ ...event.payload, durationMs: completedDurationMs });
                    }
                }
            }

            const next = toSnapshot(engine, now);
            engineRef.current = engine;
            const prev = lastSnapshotRef.current;
            if (
                next.state !== prev.state ||
                next.remainingMs !== prev.remainingMs ||
                next.completedFocusInCycle !== prev.completedFocusInCycle
            ) {
                lastSnapshotRef.current = next;
                setSnapshot(next);
            }
        }, TICK_INTERVAL_MS);

        return () => window.clearInterval(timerId);
    }, []);

    return useMemo(
        () => ({
            ...snapshot,
            start,
            pause,
            resume,
            reset,
            skip,
        }),
        [snapshot, start, pause, resume, reset, skip],
    );
}
