/**
 * Firestore data layer — Pomodoro Bird (Accounts & Cloud Sync phase).
 *
 * Mirrors the StorageService interface shape (`get`/`set`/`remove` with the
 * same STORAGE_KEYS) so the existing hooks (useSettings, useSessionStats,
 * useRewards) can target local storage or Firestore without changing their
 * call sites. Firestore is inherently asynchronous, so every method returns a
 * Promise; failures are swallowed and reported as `null`/`false` — never
 * thrown (same defensive spirit as rules.md §4 / storageService).
 *
 * Document layout (architecture.md §5.1):
 *   users/{uid}/profile                — user metadata + rewards collection
 *   users/{uid}/settings               — TimerSettings fields
 *   users/{uid}/statistics             — derived SessionStats (event updates only)
 *   users/{uid}/sessions/{sessionId}   — one doc per meaningful session event
 *
 * Quota-conscious by design (rules.md §6 — Firestore write optimization):
 * there is no per-second countdown surface at all. Only meaningful events
 * (session start/completion, settings changes, reward grants) reach Firestore,
 * keeping writes tiny for the Spark free plan.
 */

import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    setDoc,
} from 'firebase/firestore';
import type { DocumentData, Firestore } from 'firebase/firestore';

import { firebaseClient } from '../../lib/firebase';
import { STORAGE_KEYS } from '../storage/storageService';
import type { GiftRecord } from '../../types/rewards';
import type { SessionRecord, SessionStats } from '../../types/stats';

function profileRef(db: Firestore, uid: string) {
    return doc(db, 'users', uid, 'profile');
}

function settingsRef(db: Firestore, uid: string) {
    return doc(db, 'users', uid, 'settings');
}

function statisticsRef(db: Firestore, uid: string) {
    return doc(db, 'users', uid, 'statistics');
}

function sessionsCol(db: Firestore, uid: string) {
    return collection(db, 'users', uid, 'sessions');
}

function sessionRef(db: Firestore, uid: string, sessionId: string) {
    return doc(db, 'users', uid, 'sessions', sessionId);
}

export class FirestoreService {
    constructor(
        private readonly db: Firestore | null = null,
        private readonly uid: string | null = null,
    ) { }

    /** True when both Firestore and a signed-in user are available. */
    get isAvailable(): boolean {
        return this.db !== null && this.uid !== null;
    }

    /** The bound user id, or null when signed out. */
    getUid(): string | null {
        return this.uid;
    }

    /** Return a new instance bound to the given user (Firestore stays shared). */
    forUser(uid: string): FirestoreService {
        return new FirestoreService(this.db, uid);
    }

    /** Read the value for `key`; returns `null` when missing or on failure. */
    async get<T>(key: string): Promise<T | null> {
        if (!this.isAvailable) {
            return null;
        }
        try {
            switch (key) {
                case STORAGE_KEYS.settings: {
                    const snap = await getDoc(settingsRef(this.db!, this.uid!));
                    return snap.exists() ? (snap.data() as T) : null;
                }
                case STORAGE_KEYS.sessions: {
                    const snap = await getDocs(sessionsCol(this.db!, this.uid!));
                    if (snap.empty) {
                        return null;
                    }
                    const records = snap.docs.map((item) => item.data() as SessionRecord);
                    records.sort((a, b) => a.completedAt - b.completedAt);
                    return records as T;
                }
                case STORAGE_KEYS.rewards: {
                    const snap = await getDoc(profileRef(this.db!, this.uid!));
                    const data = snap.data();
                    return data && Array.isArray(data.rewards) ? (data.rewards as T) : null;
                }
                default:
                    return null;
            }
        } catch (error) {
            console.warn(`[firestore] could not read "${key}".`, error);
            return null;
        }
    }

    /** Write `value` for `key`; returns true on success, false on failure. */
    async set<T>(key: string, value: T): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            switch (key) {
                case STORAGE_KEYS.settings:
                    await setDoc(settingsRef(this.db!, this.uid!), value as DocumentData, {
                        merge: true,
                    });
                    return true;
                case STORAGE_KEYS.sessions: {
                    const records = value as unknown as SessionRecord[];
                    await Promise.all(
                        records.map((record) =>
                            setDoc(sessionRef(this.db!, this.uid!, record.id), record as DocumentData),
                        ),
                    );
                    return true;
                }
                case STORAGE_KEYS.rewards:
                    // merge: true also creates the profile doc on first write.
                    await setDoc(profileRef(this.db!, this.uid!), {
                        rewards: value as GiftRecord[],
                    }, { merge: true });
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            console.warn(`[firestore] could not write "${key}".`, error);
            return false;
        }
    }

    /** Remove the data for `key`; returns true on success, false on failure. */
    async remove(key: string): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            switch (key) {
                case STORAGE_KEYS.settings:
                    await deleteDoc(settingsRef(this.db!, this.uid!));
                    return true;
                case STORAGE_KEYS.sessions: {
                    const snap = await getDocs(sessionsCol(this.db!, this.uid!));
                    await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
                    return true;
                }
                case STORAGE_KEYS.rewards:
                    await setDoc(
                        profileRef(this.db!, this.uid!),
                        { rewards: deleteField() },
                        { merge: true },
                    );
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            console.warn(`[firestore] could not remove "${key}".`, error);
            return false;
        }
    }

    /** Append (upsert) one session record doc — the only session write in normal use. */
    async addSession(record: SessionRecord): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            await setDoc(sessionRef(this.db!, this.uid!, record.id), record as DocumentData);
            return true;
        } catch (error) {
            console.warn('[firestore] could not write session.', error);
            return false;
        }
    }

    /** Read the derived statistics doc (may not exist yet). */
    async readStatistics(): Promise<SessionStats & { updatedAt?: number } | null> {
        if (!this.isAvailable) {
            return null;
        }
        try {
            const snap = await getDoc(statisticsRef(this.db!, this.uid!));
            return snap.exists() ? (snap.data() as SessionStats & { updatedAt?: number }) : null;
        } catch (error) {
            console.warn('[firestore] could not read statistics.', error);
            return null;
        }
    }

    /** Write the derived statistics doc (one write per session event). */
    async writeStatistics(stats: SessionStats): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            await setDoc(
                statisticsRef(this.db!, this.uid!),
                { ...stats, updatedAt: Date.now() } as DocumentData,
                { merge: true },
            );
            return true;
        } catch (error) {
            console.warn('[firestore] could not write statistics.', error);
            return false;
        }
    }

    /** Ensure the profile doc exists (user metadata). Called on first sync. */
    async ensureProfile(): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            await setDoc(
                profileRef(this.db!, this.uid!),
                { createdAt: Date.now() } as DocumentData,
                { merge: true },
            );
            return true;
        } catch (error) {
            console.warn('[firestore] could not ensure profile.', error);
            return false;
        }
    }

    /**
     * Record that a focus session started. Synced as a single lightweight
     * profile field (NOT a sessions/{sessionId} doc) so the sessions collection
     * keeps its approved shape — completed records only (architecture.md §5.1).
     * One small field write per session start; no per-tick traffic.
     */
    async writeSessionStart(startedAt: number): Promise<boolean> {
        if (!this.isAvailable) {
            return false;
        }
        try {
            await setDoc(
                profileRef(this.db!, this.uid!),
                { lastSessionStartedAt: startedAt } as DocumentData,
                { merge: true },
            );
            return true;
        } catch (error) {
            console.warn('[firestore] could not write session start.', error);
            return false;
        }
    }
}

/** Shared instance; binds to a user id via `forUser(uid)` once signed in. */
export const firestoreService = new FirestoreService(firebaseClient.getFirestore());
