/**
 * useSessionStats — React binding around the persisted session history (Phase 4).
 *
 * Loads once on mount (lazy init), appends a lightweight record whenever the
 * timer engine reports a naturally completed session, and persists through the
 * Storage Service. Statistics are derived from the records (single source of
 * truth) rather than stored separately. Skipped sessions are never recorded
 * because the engine emits no completion event for them (rules.md §4 / PRD).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { storageService, STORAGE_KEYS } from '../services/storage/storageService';
import type { SessionRecord, SessionStats } from '../types/stats';
import type { SessionCompletionEvent } from './usePomodoro';
import { deriveSessionStats, toValidSessions } from '../utils/sessionStats';

export interface UseSessionStatsResult {
    /** All recorded completed sessions (newest last). */
    sessions: SessionRecord[];
    /** Derived, user-facing statistics. */
    stats: SessionStats;
    /**
     * Append a completed-session event to the history and return the created
     * record so the App shell can push the same record to Firestore.
     */
    recordSession: (event: SessionCompletionEvent) => SessionRecord;
}

/** Stable unique id; the Phase 4B reward service reuses it for idempotency. */
function createSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useSessionStats(): UseSessionStatsResult {
    const [sessions, setSessions] = useState<SessionRecord[]>(() =>
        toValidSessions(storageService.get(STORAGE_KEYS.sessions)),
    );

    const skipFirstPersistRef = useRef(true);

    useEffect(() => {
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        // Failed writes are non-fatal: stats keep updating in memory and the
        // records simply won't survive a reload (graceful degradation).
        storageService.set(STORAGE_KEYS.sessions, sessions);
    }, [sessions]);

    const recordSession = useCallback((event: SessionCompletionEvent): SessionRecord => {
        const record: SessionRecord = {
            id: createSessionId(),
            mode: event.mode,
            durationMs: event.durationMs,
            completedAt: Date.now(),
        };
        setSessions((current) => [...current, record]);
        return record;
    }, []);

    return {
        sessions,
        stats: deriveSessionStats(sessions, Date.now()),
        recordSession,
    };
}
