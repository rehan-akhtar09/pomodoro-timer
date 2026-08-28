import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';

const mocks = vi.hoisted(() => {
    const user = { uid: 'test-uid', email: 'birb@example.com', displayName: 'Birb' };
    const methods = {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        addSession: vi.fn(),
        readStatistics: vi.fn(),
        writeStatistics: vi.fn(),
        ensureProfile: vi.fn(),
        writeSessionStart: vi.fn(),
    };
    return { user, methods, forUser: vi.fn() };
});

// A signed-in user makes the App shell take the cloud path. The real hook is
// mocked entirely so no real Firebase Auth instance is ever constructed.
vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        user: mocks.user,
        status: 'signedIn',
        busy: false,
        available: true,
        createAccount: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        sendPasswordReset: vi.fn(),
    }),
}));

// The data layer is mocked so the REAL useSync runs against observable mocks:
// `forUser` returns one shared object whose methods record every cloud call.
// This proves the merge completes and that only meaningful events (never the
// per-tick countdown) reach Firestore (rules.md §6).
vi.mock('../../src/services/sync/firestoreService', () => {
    class FirestoreService {
        private readonly db: unknown;
        private readonly uid: string | null;

        constructor(db: unknown = null, uid: string | null = null) {
            this.db = db;
            this.uid = uid;
        }

        get isAvailable(): boolean {
            return this.db !== null && this.uid !== null;
        }

        getUid(): string | null {
            return this.uid;
        }

        forUser(uid: string) {
            return mocks.forUser(uid);
        }

        get() {
            return mocks.methods.get();
        }

        set() {
            return mocks.methods.set();
        }

        remove() {
            return mocks.methods.remove();
        }

        addSession() {
            return mocks.methods.addSession();
        }

        readStatistics() {
            return mocks.methods.readStatistics();
        }

        writeStatistics() {
            return mocks.methods.writeStatistics();
        }

        ensureProfile() {
            return mocks.methods.ensureProfile();
        }

        writeSessionStart() {
            return mocks.methods.writeSessionStart();
        }
    }

    return {
        FirestoreService,
        firestoreService: { forUser: mocks.forUser },
    };
});

const FIXED_NOW = Date.UTC(2026, 7, 28, 10, 0, 0);

beforeEach(() => {
    vi.clearAllMocks();
    // The merge validates raw values through toValidSettings, which warns for
    // missing data; the firebase client also warns when unconfigured.
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    localStorage.clear();

    mocks.forUser.mockReturnValue(mocks.methods);
    mocks.methods.get.mockResolvedValue(null);
    mocks.methods.set.mockResolvedValue(true);
    mocks.methods.remove.mockResolvedValue(true);
    mocks.methods.addSession.mockResolvedValue(true);
    mocks.methods.readStatistics.mockResolvedValue(null);
    mocks.methods.writeStatistics.mockResolvedValue(true);
    mocks.methods.ensureProfile.mockResolvedValue(true);
    mocks.methods.writeSessionStart.mockResolvedValue(true);

    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('cloud sync — no per-tick countdown writes', () => {
    it('writes the session start once and never writes per-tick countdown data', async () => {
        await act(async () => {
            render(<App />);
        });

        // Drain the async merge chain (all microtasks) so status reaches 'synced'
        // and the workspace mounts before we assert on the timer controls.
        await act(async () => { });

        // The one-time merge settles (idle → syncing → synced), the workspace
        // mounts, and the timer controls appear.
        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

        // Merge baseline: exactly one statistics write + one profile ensure; no
        // session records and no other set() traffic during sign-in.
        expect(mocks.methods.writeStatistics).toHaveBeenCalledTimes(1);
        expect(mocks.methods.ensureProfile).toHaveBeenCalledTimes(1);
        expect(mocks.methods.addSession).not.toHaveBeenCalled();
        expect(mocks.methods.set).not.toHaveBeenCalled();

        // Start a focus session: exactly one session-start push fires.
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        });
        expect(mocks.methods.writeSessionStart).toHaveBeenCalledTimes(1);

        // Let the countdown tick several times (500ms each). Ticks must never
        // touch Firestore: no extra session-start writes, no session records,
        // no statistics rewrites, and no other set() traffic.
        act(() => {
            vi.advanceTimersByTime(500 * 6);
        });

        expect(mocks.methods.writeSessionStart).toHaveBeenCalledTimes(1);
        expect(mocks.methods.addSession).not.toHaveBeenCalled();
        expect(mocks.methods.writeStatistics).toHaveBeenCalledTimes(1);
        expect(mocks.methods.set).not.toHaveBeenCalled();
    });
});
