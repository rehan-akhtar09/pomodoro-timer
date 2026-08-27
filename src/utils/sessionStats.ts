/**
 * Session statistics derivation — Pomodoro Bird (Phase 4).
 *
 * Pure, framework-independent functions over the persisted session records.
 * The streak definition (recorded assumption): consecutive *local* calendar
 * days, ending today, each with at least one completed focus session; a day
 * with zero focus sessions resets the streak to zero.
 */

import type { SessionRecord, SessionStats } from '../types/stats';
import { dateKeyDaysAgo, localDateKey } from './dates';

const FOCUS_MINUTES_MS = 60_000;

/** Whether unknown persisted data is a single well-formed session record. */
export function isSessionRecord(value: unknown): value is SessionRecord {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Partial<SessionRecord>;
    return (
        typeof record.id === 'string' &&
        record.id.length > 0 &&
        (record.mode === 'focus' || record.mode === 'shortBreak' || record.mode === 'longBreak') &&
        typeof record.durationMs === 'number' &&
        Number.isFinite(record.durationMs) &&
        record.durationMs > 0 &&
        typeof record.completedAt === 'number' &&
        Number.isFinite(record.completedAt)
    );
}

/** Coerce unknown persisted data into a session array, dropping bad records. */
export function toValidSessions(value: unknown): SessionRecord[] {
    if (!Array.isArray(value)) {
        if (value !== undefined && value !== null) {
            console.warn('[stats] ignoring invalid persisted sessions.', value);
        }
        return [];
    }
    const valid = value.filter(isSessionRecord);
    if (valid.length !== value.length) {
        console.warn('[stats] dropped malformed session records.', {
            total: value.length,
            kept: valid.length,
        });
    }
    return valid;
}

/** Consecutive local days (ending at `now`) each with ≥1 completed focus session. */
export function computeDailyStreak(sessions: SessionRecord[], now: number): number {
    const daysWithFocus = new Set<string>();
    for (const session of sessions) {
        if (session.mode === 'focus') {
            daysWithFocus.add(localDateKey(session.completedAt));
        }
    }

    let streak = 0;
    let day = dateKeyDaysAgo(now, 0);
    while (daysWithFocus.has(day)) {
        streak += 1;
        day = dateKeyDaysAgo(now, streak);
    }
    return streak;
}

/** Derive the user-facing statistics from the session history. */
export function deriveSessionStats(sessions: SessionRecord[], now: number): SessionStats {
    const todayKey = localDateKey(now);
    let totalFocusSessions = 0;
    let todayFocusSessions = 0;
    let todayFocusMinutes = 0;

    for (const session of sessions) {
        if (session.mode !== 'focus') {
            continue;
        }
        totalFocusSessions += 1;
        if (localDateKey(session.completedAt) === todayKey) {
            todayFocusSessions += 1;
            todayFocusMinutes += session.durationMs / FOCUS_MINUTES_MS;
        }
    }

    return {
        totalFocusSessions,
        todayFocusSessions,
        todayFocusMinutes: Math.round(todayFocusMinutes),
        streak: computeDailyStreak(sessions, now),
    };
}
