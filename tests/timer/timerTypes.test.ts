import { describe, expect, it } from 'vitest';
import {
    durationForMode,
    isBreakState,
    isFocusState,
    type TimerSettings,
} from '../../src/types/timer';

const settings: TimerSettings = {
    focusDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

describe('timer types (Phase 1 preparation)', () => {
    it('returns the configured duration for each session mode', () => {
        expect(durationForMode('focus', settings)).toBe(1500);
        expect(durationForMode('shortBreak', settings)).toBe(300);
        expect(durationForMode('longBreak', settings)).toBe(900);
    });

    it('classifies break and focus states without coupling to UI', () => {
        expect(isBreakState('SHORT_BREAK')).toBe(true);
        expect(isBreakState('SHORT_BREAK_PAUSED')).toBe(true);
        expect(isBreakState('LONG_BREAK')).toBe(true);
        expect(isBreakState('FOCUSING')).toBe(false);
        expect(isBreakState('IDLE')).toBe(false);

        expect(isFocusState('FOCUSING')).toBe(true);
        expect(isFocusState('FOCUS_PAUSED')).toBe(true);
        expect(isFocusState('SHORT_BREAK')).toBe(false);
    });
});
