import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';
import { FirestoreService } from '../../src/services/sync/firestoreService';
import { STORAGE_KEYS } from '../../src/services/storage/storageService';
import type { GiftRecord } from '../../src/types/rewards';
import type { SessionRecord, SessionStats } from '../../src/types/stats';

const mocks = vi.hoisted(() => ({
    collection: vi.fn(),
    deleteDoc: vi.fn(),
    deleteField: vi.fn(),
    doc: vi.fn(),
    getAuth: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    getFirestore: vi.fn(),
    initializeApp: vi.fn(),
    setDoc: vi.fn(),
}));

// The data layer imports the shared Firebase client, which pulls in the app and
// auth entry points. Mocking all three modules keeps the test hermetic and fast
// (no real Firebase SDK initialization in a jsdom test run).
vi.mock('firebase/app', () => ({
    initializeApp: mocks.initializeApp,
}));

vi.mock('firebase/auth', () => ({
    getAuth: mocks.getAuth,
}));

vi.mock('firebase/firestore', () => ({
    collection: mocks.collection,
    deleteDoc: mocks.deleteDoc,
    deleteField: mocks.deleteField,
    doc: mocks.doc,
    getDoc: mocks.getDoc,
    getDocs: mocks.getDocs,
    getFirestore: mocks.getFirestore,
    setDoc: mocks.setDoc,
}));

const DB = {} as Firestore;
const UID = 'test-uid';

const DELETE_FIELD_SENTINEL = '__delete_field__';

function existingDoc(data: object) {
    return { exists: () => true, data: () => data };
}

function missingDoc() {
    return { exists: () => false, data: () => undefined };
}

function emptyCollection() {
    return { empty: true, docs: [] };
}

function collectionOf(items: object[]) {
    return {
        empty: false,
        docs: items.map((data, index) => ({ data: () => data, ref: { id: `ref-${index}` } })),
    };
}

function record(id: string, completedAt: number): SessionRecord {
    return { id, mode: 'focus', durationMs: 25 * 60 * 1000, completedAt };
}

function gift(id: string): GiftRecord {
    return { id, sessionId: id, type: 'feather', rarity: 'common', earnedAt: 2000 };
}

function stats(overrides: Partial<SessionStats> = {}): SessionStats {
    return {
        totalFocusSessions: 1,
        todayFocusSessions: 1,
        todayFocusMinutes: 25,
        streak: 1,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    // The shared client logs a "configuration incomplete" warning at import time
    // in the test environment, and failure paths warn deliberately — silence both.
    vi.spyOn(console, 'warn').mockImplementation(() => { });

    mocks.doc.mockImplementation((_db: unknown, ...segments: string[]) => ({
        path: `doc:${segments.join('/')}`,
    }));
    mocks.collection.mockImplementation((_db: unknown, ...segments: string[]) => ({
        path: `col:${segments.join('/')}`,
    }));
    mocks.deleteField.mockReturnValue(DELETE_FIELD_SENTINEL);
    mocks.getDoc.mockResolvedValue(missingDoc());
    mocks.getDocs.mockResolvedValue(emptyCollection());
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.getFirestore.mockReturnValue(undefined);
    mocks.getAuth.mockReturnValue(undefined);
    mocks.initializeApp.mockReturnValue({});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('FirestoreService — availability and binding', () => {
    it('reports availability only when both Firestore and a user are bound', () => {
        expect(new FirestoreService(DB, UID).isAvailable).toBe(true);
        expect(new FirestoreService(null, UID).isAvailable).toBe(false);
        expect(new FirestoreService(DB, null).isAvailable).toBe(false);
    });

    it('exposes the bound user id', () => {
        expect(new FirestoreService(DB, UID).getUid()).toBe(UID);
        expect(new FirestoreService(DB, null).getUid()).toBeNull();
    });

    it('forUser returns a new instance bound to the requested user', () => {
        const service = new FirestoreService(DB, UID);
        const scoped = service.forUser('other-uid');
        expect(scoped).not.toBe(service);
        expect(scoped.getUid()).toBe('other-uid');
    });
});

describe('get', () => {
    it('reads settings from the settings doc', async () => {
        mocks.getDoc.mockResolvedValue(existingDoc({ focusDuration: 1500 }));
        await expect(new FirestoreService(DB, UID).get(STORAGE_KEYS.settings)).resolves.toEqual({
            focusDuration: 1500,
        });
        expect(mocks.doc).toHaveBeenCalledWith(DB, 'users', UID, 'settings');
        expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    });

    it('returns null for missing settings', async () => {
        await expect(new FirestoreService(DB, UID).get(STORAGE_KEYS.settings)).resolves.toBeNull();
        expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    });

    it('reads sessions sorted by completedAt', async () => {
        mocks.getDocs.mockResolvedValue(collectionOf([record('b', 2000), record('a', 1000)]));
        const result = await new FirestoreService(DB, UID).get<SessionRecord[]>(STORAGE_KEYS.sessions);
        expect(result?.map((item) => item.id)).toEqual(['a', 'b']);
        expect(mocks.collection).toHaveBeenCalledWith(DB, 'users', UID, 'sessions');
    });

    it('returns null when there are no session docs', async () => {
        await expect(new FirestoreService(DB, UID).get(STORAGE_KEYS.sessions)).resolves.toBeNull();
        expect(mocks.getDocs).toHaveBeenCalledTimes(1);
    });

    it('reads rewards from the profile doc', async () => {
        mocks.getDoc.mockResolvedValue(existingDoc({ rewards: [gift('g-1')] }));
        await expect(new FirestoreService(DB, UID).get(STORAGE_KEYS.rewards)).resolves.toEqual([
            gift('g-1'),
        ]);
        expect(mocks.doc).toHaveBeenCalledWith(DB, 'users', UID, 'profile');
    });

    it('returns null for rewards when the profile is missing or has no rewards field', async () => {
        const service = new FirestoreService(DB, UID);
        mocks.getDoc.mockResolvedValue(existingDoc({ createdAt: 1 }));
        await expect(service.get(STORAGE_KEYS.rewards)).resolves.toBeNull();
        mocks.getDoc.mockResolvedValue(missingDoc());
        await expect(service.get(STORAGE_KEYS.rewards)).resolves.toBeNull();
    });

    it('returns null for an unknown key without touching Firestore', async () => {
        await expect(new FirestoreService(DB, UID).get('nope')).resolves.toBeNull();
        expect(mocks.getDoc).not.toHaveBeenCalled();
    });

    it('swallows read failures into null and logs a warning', async () => {
        mocks.getDoc.mockRejectedValue(new Error('boom'));
        await expect(new FirestoreService(DB, UID).get(STORAGE_KEYS.settings)).resolves.toBeNull();
        expect(console.warn).toHaveBeenCalled();
    });
});

describe('set', () => {
    it('writes settings with merge semantics', async () => {
        const value = { focusDuration: 1500 };
        await expect(new FirestoreService(DB, UID).set(STORAGE_KEYS.settings, value)).resolves.toBe(
            true,
        );
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/settings' },
            value,
            { merge: true },
        );
    });

    it('writes one session doc per record', async () => {
        const service = new FirestoreService(DB, UID);
        await expect(
            service.set(STORAGE_KEYS.sessions, [record('a', 1000), record('b', 2000)]),
        ).resolves.toBe(true);
        expect(mocks.setDoc).toHaveBeenCalledTimes(2);
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/sessions/a' },
            record('a', 1000),
        );
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/sessions/b' },
            record('b', 2000),
        );
    });

    it('writes rewards into the profile doc with merge semantics', async () => {
        await expect(
            new FirestoreService(DB, UID).set(STORAGE_KEYS.rewards, [gift('g-1')]),
        ).resolves.toBe(true);
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/profile' },
            { rewards: [gift('g-1')] },
            { merge: true },
        );
    });

    it('returns false for an unknown key', async () => {
        await expect(new FirestoreService(DB, UID).set('nope', {})).resolves.toBe(false);
        expect(mocks.setDoc).not.toHaveBeenCalled();
    });

    it('swallows write failures into false and logs a warning', async () => {
        mocks.setDoc.mockRejectedValue(new Error('boom'));
        await expect(new FirestoreService(DB, UID).set(STORAGE_KEYS.settings, {})).resolves.toBe(
            false,
        );
        expect(console.warn).toHaveBeenCalled();
    });
});

describe('remove', () => {
    it('removes the settings doc', async () => {
        await expect(new FirestoreService(DB, UID).remove(STORAGE_KEYS.settings)).resolves.toBe(
            true,
        );
        expect(mocks.deleteDoc).toHaveBeenCalledWith({ path: 'doc:users/test-uid/settings' });
    });

    it('removes every session doc in the collection', async () => {
        mocks.getDocs.mockResolvedValue(collectionOf([record('a', 1000), record('b', 2000)]));
        await expect(new FirestoreService(DB, UID).remove(STORAGE_KEYS.sessions)).resolves.toBe(
            true,
        );
        expect(mocks.getDocs).toHaveBeenCalledWith({ path: 'col:users/test-uid/sessions' });
        expect(mocks.deleteDoc).toHaveBeenCalledTimes(2);
        expect(mocks.deleteDoc).toHaveBeenCalledWith({ id: 'ref-0' });
        expect(mocks.deleteDoc).toHaveBeenCalledWith({ id: 'ref-1' });
    });

    it('clears rewards via a deleteField sentinel on the profile doc', async () => {
        await expect(new FirestoreService(DB, UID).remove(STORAGE_KEYS.rewards)).resolves.toBe(
            true,
        );
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/profile' },
            { rewards: DELETE_FIELD_SENTINEL },
            { merge: true },
        );
    });

    it('returns false for an unknown key', async () => {
        await expect(new FirestoreService(DB, UID).remove('nope')).resolves.toBe(false);
        expect(mocks.deleteDoc).not.toHaveBeenCalled();
    });

    it('swallows removal failures into false and logs a warning', async () => {
        mocks.deleteDoc.mockRejectedValue(new Error('boom'));
        await expect(new FirestoreService(DB, UID).remove(STORAGE_KEYS.settings)).resolves.toBe(
            false,
        );
        expect(console.warn).toHaveBeenCalled();
    });
});

describe('addSession, statistics, and profile helpers', () => {
    it('addSession upserts one session doc', async () => {
        await expect(new FirestoreService(DB, UID).addSession(record('a', 1000))).resolves.toBe(
            true,
        );
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/sessions/a' },
            record('a', 1000),
        );
    });

    it('readStatistics returns the statistics doc or null when missing', async () => {
        const service = new FirestoreService(DB, UID);
        mocks.getDoc.mockResolvedValue(existingDoc(stats()));
        await expect(service.readStatistics()).resolves.toEqual(stats());
        mocks.getDoc.mockResolvedValue(missingDoc());
        await expect(service.readStatistics()).resolves.toBeNull();
    });

    it('writeStatistics merges the stats with an updatedAt timestamp', async () => {
        await expect(new FirestoreService(DB, UID).writeStatistics(stats())).resolves.toBe(true);
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/statistics' },
            expect.objectContaining({ totalFocusSessions: 1, updatedAt: expect.any(Number) }),
            { merge: true },
        );
    });

    it('ensureProfile merges a createdAt timestamp', async () => {
        await expect(new FirestoreService(DB, UID).ensureProfile()).resolves.toBe(true);
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/profile' },
            expect.objectContaining({ createdAt: expect.any(Number) }),
            { merge: true },
        );
    });

    it('writeSessionStart merges the started timestamp into the profile', async () => {
        await expect(new FirestoreService(DB, UID).writeSessionStart(1234567)).resolves.toBe(true);
        expect(mocks.setDoc).toHaveBeenCalledWith(
            { path: 'doc:users/test-uid/profile' },
            { lastSessionStartedAt: 1234567 },
            { merge: true },
        );
    });
});

describe('unavailable service — graceful local-only behavior', () => {
    const noDb = new FirestoreService(null, UID);
    const noUid = new FirestoreService(DB, null);

    it('returns null/false from every method without touching Firestore', async () => {
        for (const service of [noDb, noUid]) {
            await expect(service.get(STORAGE_KEYS.settings)).resolves.toBeNull();
            await expect(service.set(STORAGE_KEYS.settings, {})).resolves.toBe(false);
            await expect(service.remove(STORAGE_KEYS.settings)).resolves.toBe(false);
            await expect(service.addSession(record('a', 1000))).resolves.toBe(false);
            await expect(service.readStatistics()).resolves.toBeNull();
            await expect(service.writeStatistics(stats())).resolves.toBe(false);
            await expect(service.ensureProfile()).resolves.toBe(false);
            await expect(service.writeSessionStart(123)).resolves.toBe(false);
        }
        expect(mocks.getDoc).not.toHaveBeenCalled();
        expect(mocks.getDocs).not.toHaveBeenCalled();
        expect(mocks.setDoc).not.toHaveBeenCalled();
        expect(mocks.deleteDoc).not.toHaveBeenCalled();
    });
});
