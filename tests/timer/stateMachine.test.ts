import { describe, expect, it } from 'vitest';
import { nextState, type TransitionContext } from '../../src/services/timer/timerEngine';
import { type TimerSettings } from '../../src/types/timer';

const settings: TimerSettings = {
    focusDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

function ctx(overrides: Partial<TransitionContext> = {}): TransitionContext {
    return { settings, completedFocusInCycle: 0, mode: 'focus', ...overrides };
}

describe('state machine — explicit, predictable transitions', () => {
    it('IDLE responds only to START', () => {
        const c = ctx();
        expect(nextState('IDLE', { type: 'START' }, c)).toBe('FOCUSING');
        expect(nextState('IDLE', { type: 'PAUSE' }, c)).toBe('IDLE');
        expect(nextState('IDLE', { type: 'RESUME' }, c)).toBe('IDLE');
        expect(nextState('IDLE', { type: 'RESET' }, c)).toBe('IDLE');
        expect(nextState('IDLE', { type: 'SKIP' }, c)).toBe('IDLE');
    });

    it('running focus pauses/resets/skips, ignores resume', () => {
        const c = ctx();
        expect(nextState('FOCUSING', { type: 'PAUSE' }, c)).toBe('FOCUS_PAUSED');
        expect(nextState('FOCUSING', { type: 'RESET' }, c)).toBe('IDLE');
        expect(nextState('FOCUSING', { type: 'SKIP' }, c)).toBe('SHORT_BREAK');
        expect(nextState('FOCUSING', { type: 'RESUME' }, c)).toBe('FOCUSING');
        expect(nextState('FOCUSING', { type: 'START' }, c)).toBe('FOCUSING');
    });

    it('paused focus resumes, resets, or skips', () => {
        const c = ctx();
        expect(nextState('FOCUS_PAUSED', { type: 'RESUME' }, c)).toBe('FOCUSING');
        expect(nextState('FOCUS_PAUSED', { type: 'RESET' }, c)).toBe('IDLE');
        expect(nextState('FOCUS_PAUSED', { type: 'SKIP' }, c)).toBe('SHORT_BREAK');
        expect(nextState('FOCUS_PAUSED', { type: 'PAUSE' }, c)).toBe('FOCUS_PAUSED');
    });

    it('breaks pause into their paused variants and back', () => {
        const c = ctx();
        expect(nextState('SHORT_BREAK', { type: 'PAUSE' }, c)).toBe('SHORT_BREAK_PAUSED');
        expect(nextState('SHORT_BREAK_PAUSED', { type: 'RESUME' }, c)).toBe('SHORT_BREAK');
        expect(nextState('LONG_BREAK', { type: 'PAUSE' }, c)).toBe('LONG_BREAK_PAUSED');
        expect(nextState('LONG_BREAK_PAUSED', { type: 'RESUME' }, c)).toBe('LONG_BREAK');
    });

    it('a break skips back to focus', () => {
        const c = ctx({ completedFocusInCycle: 2 });
        expect(nextState('SHORT_BREAK', { type: 'SKIP' }, c)).toBe('FOCUSING');
        expect(nextState('LONG_BREAK_PAUSED', { type: 'SKIP' }, c)).toBe('FOCUSING');
    });

    it('respects sessionsBeforeLongBreak for skip and complete', () => {
        const threshold = ctx({ completedFocusInCycle: settings.sessionsBeforeLongBreak - 1 });

        expect(nextState('FOCUSING', { type: 'SKIP' }, threshold)).toBe('LONG_BREAK');
        expect(nextState('FOCUSING', { type: 'COMPLETE' }, threshold)).toBe('COMPLETED');

        const belowThreshold = ctx({ completedFocusInCycle: settings.sessionsBeforeLongBreak - 2 });
        expect(nextState('FOCUSING', { type: 'SKIP' }, belowThreshold)).toBe('SHORT_BREAK');
    });

    it('COMPLETED starts the pending session', () => {
        expect(nextState('COMPLETED', { type: 'START' }, ctx())).toBe('FOCUSING');
        expect(nextState('COMPLETED', { type: 'START' }, ctx({ mode: 'longBreak' }))).toBe('LONG_BREAK');
        expect(nextState('COMPLETED', { type: 'SKIP' }, ctx({ mode: 'shortBreak' }))).toBe('SHORT_BREAK');
    });

    it('honors auto-start flags on natural completion', () => {
        const auto = ctx({ settings: { ...settings, autoStartBreaks: true } });
        expect(nextState('FOCUSING', { type: 'COMPLETE' }, auto)).toBe('SHORT_BREAK');

        const autoFocus = ctx({ settings: { ...settings, autoStartFocus: true } });
        expect(nextState('SHORT_BREAK', { type: 'COMPLETE' }, autoFocus)).toBe('FOCUSING');
    });
});
