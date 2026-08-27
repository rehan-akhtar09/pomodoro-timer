import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../../src/types/stats';
import {
    computeDailyStreak,
    deriveSessionStats,
    toValidSessions,
} from '../../src/utils/sessionStats';

/** Noon local time on a calendar day — safe from DST/UTC skew. */
function noon(year: number, month: number, day: number): number {
    return new Date(year, month - 1, day, 12, 0, 0, 0).getTime();
}

const DAY0 = noon(2026, 8, 27); // "today" in tests
const DAY1 = noon(2026, 8, 26);
const DAY2 = noon(2026, 8, 25);

const FOCUS_25 = 25 * 60 * 1000;
const FOCUS_5 = 5 * 60 * 1000;

function record(
    mode: SessionRecord['mode'],
    completedAt: number,
    durationMs: number = FOCUS_25,
    id = `${mode}-${completedAt}`,
): SessionRecord {
    return { id, mode, durationMs, completedAt };
}

describe('session stats — daily totals', () => {
    it('counts focus sessions and minutes across multiple same-day sessions', () => {
        const sessions = [record('focus', DAY0, FOCUS_25), record('focus', DAY0, FOCUS_5)];

        const stats = deriveSessionStats(sessions, DAY0);

        expect(stats.totalFocusSessions).toBe(2);
        expect(stats.todayFocusSessions).toBe(2);
        expect(stats.todayFocusMinutes).toBe(30);
    });

    it('records breaks distinctly without counting them as focus', () => {
        const sessions = [
            record('focus', DAY0, FOCUS_25),
            record('shortBreak', DAY0, 5 * 60 * 1000),
            record('longBreak', DAY0, 15 * 60 * 1000),
        ];

        const stats = deriveSessionStats(sessions, DAY0);

        expect(stats.totalFocusSessions).toBe(1);
        expect(stats.todayFocusSessions).toBe(1);
        expect(stats.todayFocusMinutes).toBe(25);
    });

    it('only counts focus sessions from the current local day in "today" totals', () => {
        const sessions = [record('focus', DAY1, FOCUS_25), record('focus', DAY0, FOCUS_5)];

        const stats = deriveSessionStats(sessions, DAY0);

        expect(stats.totalFocusSessions).toBe(2);
        expect(stats.todayFocusSessions).toBe(1);
        expect(stats.todayFocusMinutes).toBe(5);
    });
});

describe('session stats — streak', () => {
    it('counts consecutive days ending today, each with a focus session', () => {
        const sessions = [record('focus', DAY2), record('focus', DAY1), record('focus', DAY0)];

        expect(computeDailyStreak(sessions, DAY0)).toBe(3);
    });

    it('resets the streak to zero when today has no focus session', () => {
        const sessions = [record('focus', DAY1), record('focus', DAY2)];

        expect(computeDailyStreak(sessions, DAY0)).toBe(0);
    });

    it('resets the streak across a gap in consecutive days', () => {
        // Focus on DAY0 and DAY2, but nothing on DAY1 — the streak breaks.
        const sessions = [record('focus', DAY2), record('focus', DAY0)];

        expect(computeDailyStreak(sessions, DAY0)).toBe(1);
    });

    it('ignores break sessions when computing the streak', () => {
        const sessions = [
            record('shortBreak', DAY0),
            record('shortBreak', DAY1),
            record('shortBreak', DAY2),
        ];

        expect(computeDailyStreak(sessions, DAY0)).toBe(0);
    });
});

describe('session records — validation', () => {
    it('drops malformed records and keeps well-formed ones', () => {
        const input = [
            record('focus', DAY0, FOCUS_25),
            { id: 'no-mode', durationMs: 1000, completedAt: DAY0 },
            'garbage',
            null,
            record('longBreak', DAY1, 900_000),
        ];

        const sessions = toValidSessions(input);

        expect(sessions).toHaveLength(2);
        expect(sessions[0].mode).toBe('focus');
        expect(sessions[1].mode).toBe('longBreak');
    });

    it('returns an empty array for non-array persisted data', () => {
        expect(toValidSessions('not an array')).toEqual([]);
        expect(toValidSessions(undefined)).toEqual([]);
        expect(toValidSessions(null)).toEqual([]);
        expect(toValidSessions({})).toEqual([]);
    });
});
