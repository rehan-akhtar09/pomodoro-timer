import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { AudioService } from '../../src/services/audio/audioService';

/**
 * Minimal fake HTMLAudioElement so the Audio Service can run against
 * deterministic playback (the completion chime itself is mocked at the
 * prototype level; the autoplay test injects a throwing element).
 */
interface FakeAudioElement {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    errorHandlers: Array<() => void>;
    preload: string;
    volume: number;
    currentTime: number;
    src: string;
    loop: boolean;
    paused: boolean;
}

function createFakeAudio(): FakeAudioElement {
    const element = {} as FakeAudioElement;
    element.play = vi.fn(() => {
        element.paused = false;
        return undefined;
    });
    element.pause = vi.fn(() => {
        element.paused = true;
    });
    element.errorHandlers = [];
    element.addEventListener = vi.fn((_type: string, handler: () => void) => {
        element.errorHandlers.push(handler);
    });
    element.preload = '';
    element.volume = 0;
    element.currentTime = 0;
    element.src = '';
    element.loop = false;
    element.paused = true;
    return element;
}

const mocks = vi.hoisted(() => {
    const methods = {
        get: vi.fn(async () => null),
        set: vi.fn(async () => true),
        remove: vi.fn(async () => true),
        addSession: vi.fn(async () => true),
        readStatistics: vi.fn(async () => null),
        writeStatistics: vi.fn(async () => true),
        ensureProfile: vi.fn(async () => true),
        writeSessionStart: vi.fn(async () => true),
    };
    return {
        methods,
        forUser: vi.fn(),
        notifyCompletion: vi.fn(() => true),
        getNotificationPermission: vi.fn(() => 'default' as const),
        requestNotificationPermission: vi.fn(async () => 'granted' as const),
        isNotificationSupported: vi.fn(() => true),
    };
});

// Signed out → the App shell mounts the local-only workspace immediately
// (syncReady is true) and the cloud merge never runs.
vi.mock('../../src/hooks/useAuth', () => ({
    useAuth: () => ({
        user: null,
        status: 'signedOut',
        busy: false,
        available: true,
        createAccount: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        sendPasswordReset: vi.fn(),
    }),
}));

// The data layer is mocked so the REAL useSync never touches real Firebase
// (rules.md — avoid fragile/real infra in tests).
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

// Notification Service is mocked so the completion notification can be
// observed directly (and stays independent of the real browser API).
vi.mock('../../src/services/notifications/notificationService', () => ({
    notifyCompletion: mocks.notifyCompletion,
    getNotificationPermission: mocks.getNotificationPermission,
    requestNotificationPermission: mocks.requestNotificationPermission,
    isNotificationSupported: mocks.isNotificationSupported,
}));

const FIXED_NOW = Date.UTC(2026, 7, 28, 10, 0, 0);
const FOCUS_DURATION_MS = 25 * 60 * 1000;

let completionSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

    // The chime is fire-and-forget; stub it so it can never throw and skip the
    // notification that follows it in handleSessionComplete.
    completionSpy = vi
        .spyOn(AudioService.prototype, 'playCompletionSound')
        .mockImplementation(() => {});

    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('completion notification (independent of audio)', () => {
    it('fires the completion chime and the optional notification on natural focus completion', async () => {
        await act(async () => {
            render(<App />);
        });

        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        });

        // A full 25-minute focus session (the tick where targetEndTime is hit).
        act(() => {
            vi.advanceTimersByTime(FOCUS_DURATION_MS);
        });

        expect(completionSpy).toHaveBeenCalledTimes(1);
        expect(mocks.notifyCompletion).toHaveBeenCalledTimes(1);
        expect(mocks.notifyCompletion).toHaveBeenCalledWith(
            'Focus complete',
            'Time for a break — well done.',
        );
        expect(screen.getByRole('region', { name: 'Timer: Session complete' })).toBeInTheDocument();
    });

    it('shows calm in-app feedback when autoplay is blocked and keeps the timer running', async () => {
        const blockedAudio = createFakeAudio();
        blockedAudio.play.mockImplementation(() => {
            throw Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
        });
        // The real ensureBackgroundElement assigns this.background before
        // returning; the spy must replicate that so the retry path (same
        // track, same shared element) reaches play() again on Resume.
        vi.spyOn(
            AudioService.prototype as unknown as {
                ensureBackgroundElement: () => HTMLAudioElement | null;
                background: HTMLAudioElement | null;
            },
            'ensureBackgroundElement',
        ).mockImplementation(function (this: {
            ensureBackgroundElement: () => HTMLAudioElement | null;
            background: HTMLAudioElement | null;
        }) {
            this.background = blockedAudio as unknown as HTMLAudioElement;
            return blockedAudio as unknown as HTMLAudioElement;
        });

        await act(async () => {
            render(<App />);
        });

        expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        });

        // The blocked autoplay surfaces calm in-app feedback (never an error)…
        expect(screen.getByRole('status')).toHaveTextContent(
            'Sound will start after you interact with the page.',
        );
        // …and the timer itself is unaffected: it keeps running.
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
        expect(mocks.notifyCompletion).not.toHaveBeenCalled();

        // A later direct user interaction retries the blocked track once.
        const playsAfterStart = blockedAudio.play.mock.calls.length;
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        });
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
        });
        expect(blockedAudio.play.mock.calls.length).toBeGreaterThan(playsAfterStart);
    });
});
