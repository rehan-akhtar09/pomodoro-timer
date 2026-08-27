import { describe, expect, it } from 'vitest';
import {
    applyAction,
    createInitialState,
    type TimerEngineState,
} from '../../src/services/timer/timerEngine';
import { DEFAULT_TIMER_SETTINGS, type TimerSettings } from '../../src/types/timer';

const settings: TimerSettings = DEFAULT_TIMER_SETTINGS;
const T0 = 1_700_000_000_000;
const FOCUS_MS = settings.focusDuration * 1000;

function runningFocus(now: number): TimerEngineState {
    return {
        ...createInitialState(settings),
        state: 'FOCUSING',
        mode: 'focus',
        targetEndTime: now + FOCUS_MS,
        remainingMs: FOCUS_MS,
        durationMs: FOCUS_MS,
        completedFocusInCycle: 0,
    };
}

describe('session recording — engine event flow', () => {
    it('emits exactly one SESSION_COMPLETED event for a naturally completed focus session', () => {
        const result = applyAction(runningFocus(T0), { type: 'COMPLETE' }, settings, T0 + FOCUS_MS);

        expect(result.events).toHaveLength(1);
        expect(result.events[0]).toMatchObject({
            type: 'SESSION_COMPLETED',
            payload: { mode: 'focus', nextMode: 'shortBreak' },
        });
    });

    it('emits no event for a skipped session (so skips are never recorded)', () => {
        const result = applyAction(runningFocus(T0), { type: 'SKIP' }, settings, T0 + 1000);

        expect(result.events).toEqual([]);
    });

    it('emits the completed mode distinctly for a break', () => {
        const longBreak = runningFocus(T0);
        const breakState: TimerEngineState = {
            ...longBreak,
            state: 'LONG_BREAK',
            mode: 'longBreak',
        };

        const result = applyAction(breakState, { type: 'COMPLETE' }, settings, T0 + FOCUS_MS);

        expect(result.events).toHaveLength(1);
        expect(result.events[0]).toMatchObject({
            type: 'SESSION_COMPLETED',
            payload: { mode: 'longBreak', nextMode: 'focus' },
        });
    });
});
