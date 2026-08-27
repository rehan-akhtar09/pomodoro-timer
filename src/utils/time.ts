/**
 * Time formatting helpers — Pomodoro Bird.
 * Kept framework-independent so the engine, hook, and UI share one rule set.
 */

/** Clamp a millisecond value to a whole number of remaining seconds (ceiling). */
export function secondsFromMs(ms: number): number {
    return Math.max(0, Math.ceil(ms / 1000));
}

/** Format milliseconds as MM:SS (e.g. 1500000 -> "25:00"). */
export function formatTime(ms: number): string {
    const totalSeconds = secondsFromMs(ms);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
