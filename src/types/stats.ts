import type { SessionMode } from './timer';

/**
 * Statistics and session-history types — Pomodoro Bird (Phase 4).
 *
 * Records are intentionally flat and JSON-serializable (architecture.md §5):
 * they mirror the future Firestore shape (`sessions/{sessionId}`), so local
 * data can migrate to the cloud later without reshaping.
 */

/** One completed session, recorded when the engine emits SESSION_COMPLETED. */
export interface SessionRecord {
    /** Stable unique id (the Phase 4B reward system reuses it for idempotency). */
    id: string;
    /** The session that actually completed. */
    mode: SessionMode;
    /** Configured duration of the completed session in ms. */
    durationMs: number;
    /** Epoch ms when the session completed. */
    completedAt: number;
}

/** Derived, user-facing statistics (design.md §3: "Sessions: 3 Streak: 4"). */
export interface SessionStats {
    /** All-time completed focus sessions. */
    totalFocusSessions: number;
    /** Completed focus sessions today (local calendar day). */
    todayFocusSessions: number;
    /** Focus minutes completed today (rounded from ms). */
    todayFocusMinutes: number;
    /** Current daily streak (consecutive local days with ≥1 focus session). */
    streak: number;
}
