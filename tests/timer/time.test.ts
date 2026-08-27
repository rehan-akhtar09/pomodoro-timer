import { describe, expect, it } from 'vitest';
import { formatTime, secondsFromMs } from '../../src/utils/time';

describe('time formatting', () => {
    it('formats minutes and seconds as MM:SS', () => {
        expect(formatTime(25 * 60 * 1000)).toBe('25:00');
        expect(formatTime(5 * 60 * 1000)).toBe('05:00');
        expect(formatTime(15 * 60 * 1000)).toBe('15:00');
        expect(formatTime(90 * 1000)).toBe('01:30');
        expect(formatTime(0)).toBe('00:00');
    });

    it('rounds partial seconds up so a live countdown never shows 00:00 early', () => {
        expect(formatTime(1000)).toBe('00:01');
        expect(formatTime(1500)).toBe('00:02');
        expect(formatTime(61_000)).toBe('01:01');
    });

    it('never returns negative time', () => {
        expect(formatTime(-5000)).toBe('00:00');
        expect(secondsFromMs(-1)).toBe(0);
    });
});
