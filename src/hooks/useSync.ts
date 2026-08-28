/**
 * useSync — cloud sync orchestration (Accounts & Cloud Sync phase).
 *
 * Sits at the App shell and coordinates local (localStorage) and cloud
 * (Firestore) data for the signed-in user.
 *
 * Lifecycle:
 *  - Signed out: status `idle`, no cloud reads or writes (PRD.md — no account
 *    required, offline works).
 *  - On sign-in: one-time merge of local + cloud data per the rules in
 *    syncMerge.ts. The merged result is written to localStorage first, then
 *    the App shell re-mounts the data hooks (keyed by uid) so they lazy-init
 *    from the merged data. Local-only sessions/rewards/settings are then
 *    uploaded to Firestore (nothing discarded).
 *  - While signed in: meaningful events (session completed, settings changed,
 *    reward granted) are pushed to Firestore by the App shell through the
 *    `push*` callbacks below. There is no per-second countdown write anywhere
 *    in this path (rules.md §6 — Firestore write optimization).
 *  - On sign-out: sync stops; localStorage keeps the last merged state.
 *
 * Error handling: a failed merge or failed upload never throws to the UI —
 * it logs, sets a calm `error` message (design.md §13), and the app keeps
 * working local-only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthUserInfo } from '../services/auth/authService';
import { FirestoreService, firestoreService } from '../services/sync/firestoreService';
import { planSyncMerge } from '../services/sync/syncMerge';
import { STORAGE_KEYS, storageService } from '../services/storage/storageService';
import type { GiftRecord } from '../types/rewards';
import type { SessionRecord, SessionStats } from '../types/stats';
import type { TimerSettings } from '../types/timer';
import { toValidRewards } from '../utils/rewards';
import { toValidSessions, deriveSessionStats } from '../utils/sessionStats';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface UseSyncResult {
    /** `syncing` → App shell may show a calm indicator before mounting data hooks. */
    status: SyncStatus;
    /** Calm, human-readable message when the last sync failed (null when fine). */
    error: string | null;
    /** Push one completed session record to Firestore (called by App shell). */
    pushSession: (record: SessionRecord) => void;
    /** Push a session-start timestamp to Firestore (single profile field write). */
    pushSessionStart: (startedAt: number) => void;
    /** Push the full session history-derived statistics doc to Firestore. */
    pushStatistics: (stats: SessionStats) => void;
    /** Push a settings change to Firestore (called by the App shell). */
    pushSettings: (next: TimerSettings) => void;
    /** Push the full rewards collection to Firestore (reward granted). */
    pushRewards: (rewards: GiftRecord[]) => void;
}

/** Fire-and-forget upload with a calm log on failure — never throws. */
async function upload(uid: string, action: () => Promise<boolean>) {
    try {
        await action();
    } catch (error) {
        console.warn(`[sync] upload failed for user ${uid}.`, error);
    }
}

export function useSync(
    user: AuthUserInfo | null,
    deps?: { service?: FirestoreService },
): UseSyncResult {
    const serviceRef = useRef<FirestoreService>(deps?.service ?? firestoreService);
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const lastUserRef = useRef<AuthUserInfo | null>(null);
    const userRef = useRef<AuthUserInfo | null>(user);
    userRef.current = user;

    const runMerge = useCallback(async (uid: string) => {
        const service = serviceRef.current.forUser(uid);
        setStatus('syncing');
        setError(null);
        try {
            const [cloudSettings, cloudSessions, cloudRewards] = await Promise.all([
                service.get<TimerSettings>(STORAGE_KEYS.settings),
                service.get<SessionRecord[]>(STORAGE_KEYS.sessions),
                service.get<GiftRecord[]>(STORAGE_KEYS.rewards),
            ]);

            const plan = planSyncMerge(
                {
                    settings: storageService.get<TimerSettings>(STORAGE_KEYS.settings),
                    sessions: toValidSessions(storageService.get(STORAGE_KEYS.sessions)),
                    rewards: toValidRewards(storageService.get(STORAGE_KEYS.rewards)),
                },
                {
                    settings: cloudSettings,
                    sessions: toValidSessions(cloudSessions),
                    rewards: toValidRewards(cloudRewards),
                },
            );

            // Persist the merged truth locally FIRST so the re-mounted data hooks
            // lazy-init from it (they skip their first write, so nothing is
            // re-written or clobbered here).
            storageService.set(STORAGE_KEYS.settings, plan.settings);
            storageService.set(STORAGE_KEYS.sessions, plan.sessions);
            storageService.set(STORAGE_KEYS.rewards, plan.rewards);

            // Upload local-only data to the cloud — never discard it.
            if (plan.uploadSettings) {
                await upload(uid, () => service.set(STORAGE_KEYS.settings, plan.settings));
            }
            for (const record of plan.uploadSessions) {
                await upload(uid, () => service.addSession(record));
            }
            if (plan.uploadRewards.length > 0) {
                await upload(uid, () => service.set(STORAGE_KEYS.rewards, plan.rewards));
            }
            // Derived statistics doc (one write per sign-in; updated per session).
            await upload(uid, () =>
                service.writeStatistics(deriveSessionStats(plan.sessions, Date.now())),
            );
            await upload(uid, () => service.ensureProfile());

            setStatus('synced');
        } catch (err) {
            console.warn('[sync] merge failed; staying local-only.', err);
            setStatus('error');
            setError('Cloud sync hit a snag. Your data is safe on this device.');
        }
    }, []);

    // Trigger the one-time merge when the signed-in user changes.
    useEffect(() => {
        const current = user;
        const prev = lastUserRef.current;
        lastUserRef.current = current;

        if (current === null) {
            if (prev !== null) {
                setStatus('idle');
                setError(null);
            }
            return;
        }
        if (prev === null || prev.uid !== current.uid) {
            void runMerge(current.uid);
        }
    }, [user, runMerge]);

    const pushSession = useCallback(
        (record: SessionRecord) => {
            const current = userRef.current;
            if (current === null) return;
            void upload(current.uid, () =>
                serviceRef.current.forUser(current.uid).addSession(record),
            );
        },
        [],
    );

    const pushSessionStart = useCallback(
        (startedAt: number) => {
            const current = userRef.current;
            if (current === null) return;
            void upload(current.uid, () =>
                serviceRef.current.forUser(current.uid).writeSessionStart(startedAt),
            );
        },
        [],
    );

    const pushStatistics = useCallback(
        (stats: SessionStats) => {
            const current = userRef.current;
            if (current === null) return;
            void upload(current.uid, () =>
                serviceRef.current.forUser(current.uid).writeStatistics(stats),
            );
        },
        [],
    );

    const pushSettings = useCallback(
        (next: TimerSettings) => {
            const current = userRef.current;
            if (current === null) return;
            void upload(current.uid, () =>
                serviceRef.current.forUser(current.uid).set(STORAGE_KEYS.settings, next),
            );
        },
        [],
    );

    const pushRewards = useCallback(
        (rewards: GiftRecord[]) => {
            const current = userRef.current;
            if (current === null) return;
            void upload(current.uid, () =>
                serviceRef.current.forUser(current.uid).set(STORAGE_KEYS.rewards, rewards),
            );
        },
        [],
    );

    return { status, error, pushSession, pushSessionStart, pushStatistics, pushSettings, pushRewards };
}
