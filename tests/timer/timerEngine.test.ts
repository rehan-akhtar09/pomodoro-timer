import { describe, expect, it } from 'vitest';
import {
    applyAction,
    createInitialState,
    getRemainingMs,
    isRunningState,
    nextState,
    type TimerEngineState,
} from '../../src/services/timer/timerEngine';
import { type TimerSettings } from '../../src/types/timer';

const settings: TimerSettings = {
    focusDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

const T0 = 1_700_000_000_000;

function stateWith(partial: Partial<TimerEngineState>): TimerEngineState {
    return { ...createInitialState(settings), ...partial };
}

describe('timer engine — start', () => {
    it('starts from IDLE into FOCUSING with a correct target end time', () => {
        const result = applyAction(createInitialState(settings), { type: 'START' }, settings, T0);

        expect(result.state.state).toBe('FOCUSING');
        expect(result.state.mode).toBe('focus');
        expect(result.state.targetEndTime).toBe(T0 + settings.focusDuration * 1000);
        expect(result.state.remainingMs).toBe(settings.focusDuration * 1000);
        expect(result.state.completedFocusInCycle).toBe(0);
    });

    it('recomputes remaining from timestamps (never a decremented counter)', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;

        // After 30 simulated seconds the derived remaining reflects real time.
        expect(getRemainingMs(running, T0 + 30_000)).toBe(settings.focusDuration * 1000 - 30_000);
        // Elapsed time is never accumulated across ticks.
        expect(getRemainingMs(running, T0 + 31_000)).toBe(settings.focusDuration * 1000 - 31_000);
    });

    it('START is ignored when already running', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const again = applyAction(running, { type: 'START' }, settings, T0 + 5_000);

        expect(again.state).toBe(running);
        expect(again.events).toEqual([]);
    });
});

describe('timer engine — pause', () => {
    it('pauses FOCUSING into FOCUS_PAUSED and freezes the remaining time', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const paused = applyAction(running, { type: 'PAUSE' }, settings, T0 + 60_000).state;

        expect(paused.state).toBe('FOCUS_PAUSED');
        expect(paused.mode).toBe('focus');
        expect(paused.targetEndTime).toBeNull();
        // Frozen at the exact moment of pausing.
        expect(paused.remainingMs).toBe(settings.focusDuration * 1000 - 60_000);

        // Time passing while paused must not change the frozen value.
        expect(getRemainingMs(paused, T0 + 90_000)).toBe(settings.focusDuration * 1000 - 60_000);
    });

    it('pauses SHORT_BREAK and LONG_BREAK into their paused states', () => {
        const shortBreak = stateWith({ state: 'SHORT_BREAK', mode: 'shortBreak', targetEndTime: T0 + 5_000 });
        expect(applyAction(shortBreak, { type: 'PAUSE' }, settings, T0 + 2_000).state.state).toBe(
            'SHORT_BREAK_PAUSED',
        );

        const longBreak = stateWith({ state: 'LONG_BREAK', mode: 'longBreak', targetEndTime: T0 + 5_000 });
        expect(applyAction(longBreak, { type: 'PAUSE' }, settings, T0 + 2_000).state.state).toBe(
            'LONG_BREAK_PAUSED',
        );
    });
});

describe('timer engine — resume', () => {
    it('resumes with the preserved remaining time and a fresh target end time', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const paused = applyAction(running, { type: 'PAUSE' }, settings, T0 + 60_000).state;
        const resumed = applyAction(paused, { type: 'RESUME' }, settings, T0 + 120_000).state;

        expect(resumed.state).toBe('FOCUSING');
        expect(resumed.targetEndTime).toBe(T0 + 120_000 + (settings.focusDuration * 1000 - 60_000));

        // The paused elapsed time is not double counted.
        expect(getRemainingMs(resumed, T0 + 130_000)).toBe(settings.focusDuration * 1000 - 60_000 - 10_000);
    });
});

describe('timer engine — reset', () => {
    it('returns to a fresh IDLE with the full focus duration', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const reset = applyAction(running, { type: 'RESET' }, settings, T0 + 30_000).state;

        expect(reset.state).toBe('IDLE');
        expect(reset.mode).toBeNull();
        expect(reset.targetEndTime).toBeNull();
        expect(reset.remainingMs).toBe(settings.focusDuration * 1000);
        expect(reset.completedFocusInCycle).toBe(0);
    });

    it('reset from IDLE stays IDLE', () => {
        const reset = applyAction(createInitialState(settings), { type: 'RESET' }, settings, T0).state;
        expect(reset.state).toBe('IDLE');
    });
});

describe('timer engine — skip', () => {
    it('skips FOCUSING into SHORT_BREAK and increments the cycle count', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const result = applyAction(running, { type: 'SKIP' }, settings, T0 + 10_000);

        expect(result.state.state).toBe('SHORT_BREAK');
        expect(result.state.mode).toBe('shortBreak');
        expect(result.state.completedFocusInCycle).toBe(1);
        expect(result.state.targetEndTime).toBe(T0 + 10_000 + settings.shortBreakDuration * 1000);
    });

    it('skips a break into FOCUSING', () => {
        const shortBreak = stateWith({ state: 'SHORT_BREAK', mode: 'shortBreak', targetEndTime: T0 + 5_000 });
        const result = applyAction(shortBreak, { type: 'SKIP' }, settings, T0 + 1_000);

        expect(result.state.state).toBe('FOCUSING');
        expect(result.state.mode).toBe('focus');
        // Skipping a break does not complete a focus session, so the count is unchanged.
        expect(result.state.completedFocusInCycle).toBe(0);
    });

    it('skips from IDLE does nothing', () => {
        const result = applyAction(createInitialState(settings), { type: 'SKIP' }, settings, T0);
        expect(result.state.state).toBe('IDLE');
        expect(result.events).toEqual([]);
    });
});

describe('timer engine — session transitions', () => {
    function focusState(completedFocusInCycle: number): TimerEngineState {
        return stateWith({
            state: 'FOCUSING',
            mode: 'focus',
            targetEndTime: T0 + 10_000,
            durationMs: settings.focusDuration * 1000,
            completedFocusInCycle,
        });
    }

    it('natural focus completion goes through COMPLETED when auto-start is off', () => {
        const result = applyAction(focusState(0), { type: 'COMPLETE' }, settings, T0 + 10_000);

        expect(result.state.state).toBe('COMPLETED');
        expect(result.state.mode).toBe('shortBreak');
        expect(result.state.remainingMs).toBe(0);
        expect(result.state.completedFocusInCycle).toBe(1);

        // A completion event carries the session info for later phases.
        expect(result.events).toHaveLength(1);
        expect(result.events[0]).toEqual({
            type: 'SESSION_COMPLETED',
            payload: { mode: 'focus', completedFocusInCycle: 1, nextMode: 'shortBreak' },
        });
    });

    it('focus to long break on the Nth session', () => {
        const result = applyAction(focusState(3), { type: 'COMPLETE' }, settings, T0 + 10_000);

        expect(result.state.state).toBe('COMPLETED');
        expect(result.state.mode).toBe('longBreak');
        expect(result.events[0]?.payload.nextMode).toBe('longBreak');
    });

    it('skip on the Nth session goes straight to LONG_BREAK', () => {
        const result = applyAction(focusState(3), { type: 'SKIP' }, settings, T0 + 10_000);
        expect(result.state.state).toBe('LONG_BREAK');
        expect(result.state.mode).toBe('longBreak');
    });

    it('a long break completion resets the cycle counter', () => {
        const longBreak = stateWith({
            state: 'LONG_BREAK',
            mode: 'longBreak',
            targetEndTime: T0 + 10_000,
            durationMs: settings.longBreakDuration * 1000,
            completedFocusInCycle: 4,
        });
        const result = applyAction(longBreak, { type: 'COMPLETE' }, settings, T0 + 10_000);

        expect(result.state.state).toBe('COMPLETED');
        expect(result.state.mode).toBe('focus');
        expect(result.state.completedFocusInCycle).toBe(0);
        expect(result.events[0]?.payload).toEqual({
            mode: 'longBreak',
            completedFocusInCycle: 0,
            nextMode: 'focus',
        });
    });

    it('continues the cycle through COMPLETED with START', () => {
        const completed = applyAction(focusState(0), { type: 'COMPLETE' }, settings, T0 + 10_000).state;
        const started = applyAction(completed, { type: 'START' }, settings, T0 + 11_000).state;

        expect(started.state).toBe('SHORT_BREAK');
        expect(started.mode).toBe('shortBreak');
        expect(started.targetEndTime).toBe(T0 + 11_000 + settings.shortBreakDuration * 1000);
    });
});

describe('timer engine — session counting across cycles', () => {
    it('counts focus sessions and resets after a long break', () => {
        // Three focus sessions, then the fourth long break, then back to focus.
        let engine = createInitialState(settings);
        const focusRuns = 4;

        for (let i = 0; i < focusRuns; i += 1) {
            engine = applyAction(engine, { type: 'START' }, settings, T0).state;
            // Skip the focus session.
            const skipped = applyAction(engine, { type: 'SKIP' }, settings, T0 + 1_000);
            engine = skipped.state;
            if (engine.state !== 'LONG_BREAK') {
                // Skip the short break too.
                engine = applyAction(engine, { type: 'SKIP' }, settings, T0 + 2_000).state;
            }
        }

        // After the 4th focus session we should be in LONG_BREAK.
        expect(engine.state).toBe('LONG_BREAK');
        expect(engine.completedFocusInCycle).toBe(4);

        // Finish the long break and start focusing again — cycle resets.
        engine = applyAction(engine, { type: 'COMPLETE' }, settings, T0 + 3_000).state;
        expect(engine.state).toBe('COMPLETED');
        expect(engine.completedFocusInCycle).toBe(0);
        expect(engine.mode).toBe('focus');

        engine = applyAction(engine, { type: 'START' }, settings, T0 + 4_000).state;
        expect(engine.state).toBe('FOCUSING');
        expect(engine.completedFocusInCycle).toBe(0);
    });
});

describe('timer engine — auto-start settings', () => {
    const autoSettings: TimerSettings = { ...settings, autoStartBreaks: true, autoStartFocus: true };

    it('auto-starts the break when autoStartBreaks is on', () => {
        const running = applyAction(createInitialState(settings), { type: 'START' }, settings, T0).state;
        const completed = applyAction(running, { type: 'COMPLETE' }, autoSettings, T0 + 10_000).state;

        expect(completed.state).toBe('SHORT_BREAK');
        expect(completed.mode).toBe('shortBreak');
        expect(completed.targetEndTime).toBe(T0 + 10_000 + settings.shortBreakDuration * 1000);
    });

    it('auto-starts focus after a break when autoStartFocus is on', () => {
        const shortBreak = stateWith({ state: 'SHORT_BREAK', mode: 'shortBreak', targetEndTime: T0 + 5_000 });
        const completed = applyAction(shortBreak, { type: 'COMPLETE' }, autoSettings, T0 + 5_000).state;

        expect(completed.state).toBe('FOCUSING');
        expect(completed.mode).toBe('focus');
    });
});

describe('timer engine — state machine helper', () => {
    it('nextState handles every transition type explicitly', () => {
        const ctx = { settings, completedFocusInCycle: 0, mode: 'focus' as const };

        expect(nextState('IDLE', { type: 'START' }, ctx)).toBe('FOCUSING');
        expect(nextState('FOCUSING', { type: 'PAUSE' }, ctx)).toBe('FOCUS_PAUSED');
        expect(nextState('FOCUS_PAUSED', { type: 'RESUME' }, ctx)).toBe('FOCUSING');
        expect(nextState('SHORT_BREAK', { type: 'PAUSE' }, ctx)).toBe('SHORT_BREAK_PAUSED');
        expect(nextState('SHORT_BREAK_PAUSED', { type: 'RESUME' }, ctx)).toBe('SHORT_BREAK');
        expect(nextState('LONG_BREAK', { type: 'PAUSE' }, ctx)).toBe('LONG_BREAK_PAUSED');
        expect(nextState('LONG_BREAK_PAUSED', { type: 'RESUME' }, ctx)).toBe('LONG_BREAK');
        expect(nextState('FOCUSING', { type: 'RESET' }, ctx)).toBe('IDLE');
        expect(nextState('COMPLETED', { type: 'START' }, ctx)).toBe('FOCUSING');
    });

    it('isRunningState classifies only the three running states', () => {
        expect(isRunningState('FOCUSING')).toBe(true);
        expect(isRunningState('SHORT_BREAK')).toBe(true);
        expect(isRunningState('LONG_BREAK')).toBe(true);
        expect(isRunningState('FOCUS_PAUSED')).toBe(false);
        expect(isRunningState('IDLE')).toBe(false);
        expect(isRunningState('COMPLETED')).toBe(false);
    });
});
