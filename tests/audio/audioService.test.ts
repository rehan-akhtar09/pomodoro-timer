import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AudioService,
    FADE_DURATION_MS,
    SWITCH_FADE_MS,
    type AudioFeedbackKind,
    type AudioServiceConfig,
    type AudioTrackUrls,
} from '../../src/services/audio/audioService';
import { DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '../../src/types/audio';

/**
 * Minimal fake HTMLAudioElement. The Audio Service only reads/writes these
 * members, so the fake keeps the tests deterministic without a real media
 * stack. `play()` flips `paused` only on success — on a throw/rejection the
 * element stays paused, which the service relies on for autoplay retries.
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

const TRACKS: AudioTrackUrls = {
    focus: '/assets/audio/focus-loop.mp3',
    break: '/assets/audio/break-loop.mp3',
    completion: '/assets/audio/completion-chime.mp3',
};

describe('AudioService', () => {
    let feedback: Array<{ kind: AudioFeedbackKind; message: string }> = [];
    let created: FakeAudioElement[] = [];

    /** Build a service with injectable preferences and/or an element factory. */
    function createService(
        prefs: Partial<AudioPreferences> = {},
        factory?: () => FakeAudioElement,
    ): AudioService {
        feedback = [];
        created = [];
        const config: AudioServiceConfig = {
            tracks: TRACKS,
            createAudio: () => {
                const element = factory?.() ?? createFakeAudio();
                created.push(element);
                return element as unknown as HTMLAudioElement;
            },
            onFeedback: (kind, message) => {
                feedback.push({ kind, message });
            },
        };
        const service = new AudioService(config);
        service.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, ...prefs });
        return service;
    }

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('audio state transitions (architecture.md §3 — Audio State)', () => {
        it('keeps IDLE silent without creating any audio element', () => {
            const service = createService();
            service.updateTimerState('IDLE');
            expect(created).toHaveLength(0);
        });

        it('plays the focus track once on the shared element with loop and a gentle fade-in', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');

            expect(created).toHaveLength(1);
            const element = created[0];
            expect(element.src).toBe(TRACKS.focus);
            expect(element.loop).toBe(true);
            expect(element.preload).toBe('auto');
            expect(element.paused).toBe(false);
            expect(element.play).toHaveBeenCalledTimes(1);
            expect(element.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));

            // The volume fades in gradually to the configured level.
            expect(element.volume).toBe(0);
            vi.advanceTimersByTime(FADE_DURATION_MS);
            expect(element.volume).toBeCloseTo(DEFAULT_AUDIO_PREFERENCES.backgroundVolume, 5);
        });

        it('reuses the same element when switching focus to break (never two copies)', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.updateTimerState('SHORT_BREAK');
            // The current track fades out before the new one loads.
            vi.advanceTimersByTime(SWITCH_FADE_MS);

            expect(created).toHaveLength(1);
            const element = created[0];
            expect(element.src).toBe(TRACKS.break);
            expect(element.loop).toBe(true);
            expect(element.play).toHaveBeenCalledTimes(2);

            vi.advanceTimersByTime(FADE_DURATION_MS);
            expect(element.volume).toBeCloseTo(DEFAULT_AUDIO_PREFERENCES.backgroundVolume, 5);
        });

        it('treats LONG_BREAK the same as SHORT_BREAK', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.updateTimerState('LONG_BREAK');
            vi.advanceTimersByTime(SWITCH_FADE_MS);

            expect(created).toHaveLength(1);
            expect(created[0].src).toBe(TRACKS.break);
        });

        it("pauses immediately and restores the volume when pauseBehavior is 'pause'", () => {
            const service = createService({ pauseBehavior: 'pause' });
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.updateTimerState('FOCUS_PAUSED');

            const element = created[0];
            expect(element.paused).toBe(true);
            expect(element.volume).toBe(DEFAULT_AUDIO_PREFERENCES.backgroundVolume);
            // One pause from loadTrack, one from the explicit pause behavior.
            expect(element.pause).toHaveBeenCalledTimes(2);
        });

        it("fades out before pausing when pauseBehavior is 'fade'", () => {
            const service = createService({ pauseBehavior: 'fade' });
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.updateTimerState('FOCUS_PAUSED');
            // The fade is still in progress at the moment of pausing.
            expect(created[0].volume).toBeCloseTo(DEFAULT_AUDIO_PREFERENCES.backgroundVolume, 5);

            vi.advanceTimersByTime(FADE_DURATION_MS);
            expect(created[0].paused).toBe(true);
            expect(created[0].volume).toBe(0);
        });

        it('fades the background out on COMPLETED and pauses it', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.updateTimerState('COMPLETED');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            const element = created[0];
            expect(element.paused).toBe(true);
            expect(element.volume).toBe(0);
        });
    });

    describe('failure isolation (rules.md — autoplay)', () => {
        it('handles a blocked autoplay calmly and retries once on the next user gesture', () => {
            const element = createFakeAudio();
            element.play.mockImplementation(() => {
                throw Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
            });
            const service = createService({}, () => element);

            expect(() => service.updateTimerState('FOCUSING')).not.toThrow();

            expect(element.paused).toBe(true);
            expect(feedback).toEqual([
                { kind: 'autoplay-blocked', message: 'Sound will start after you interact with the page.' },
            ]);

            service.notifyUserGesture();
            expect(element.play).toHaveBeenCalledTimes(2);
            expect(feedback).toHaveLength(2);
        });

        it('handles a rejected play() promise without throwing', async () => {
            const element = createFakeAudio();
            element.play.mockReturnValue(
                Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })),
            );
            const service = createService({}, () => element);

            service.updateTimerState('FOCUSING');
            // Flush the promise rejection through the .catch attached by safePlay.
            await Promise.resolve();
            await Promise.resolve();

            expect(feedback).toHaveLength(1);
            expect(feedback[0]).toEqual({
                kind: 'autoplay-blocked',
                message: 'Sound will start after you interact with the page.',
            });
        });

        it('surfaces a corrupt/missing asset error calmly and stops the background', () => {
            const element = createFakeAudio();
            element.play.mockImplementation(() => {
                throw new Error('The audio source is corrupt or missing');
            });
            const service = createService({}, () => element);

            expect(() => service.updateTimerState('FOCUSING')).not.toThrow();

            expect(feedback).toEqual([
                { kind: 'asset-error', message: 'Background sound is unavailable right now.' },
            ]);
            expect(element.paused).toBe(true);
            expect(element.volume).toBe(0);
            expect(element.play).toHaveBeenCalledTimes(1);
        });

        it('reports and stops when the background element emits an error event', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            const element = created[0];
            expect(element.errorHandlers).toHaveLength(1);

            element.errorHandlers[0]();

            expect(feedback).toEqual([
                { kind: 'asset-error', message: 'Background sound is unavailable right now.' },
            ]);
            expect(element.paused).toBe(true);
            expect(element.volume).toBe(0);
        });

        it('reports a browser that cannot create audio elements without throwing', () => {
            const service = createService({}, () => {
                throw new Error('audio unavailable');
            });

            expect(() => service.updateTimerState('FOCUSING')).not.toThrow();
            expect(feedback).toEqual([
                { kind: 'asset-error', message: 'Audio is unavailable in this browser.' },
            ]);
        });
    });

    describe('completion chime', () => {
        it('plays the completion chime on a separate element with the completion track', () => {
            const service = createService();
            service.playCompletionSound();

            expect(created).toHaveLength(1);
            const element = created[0];
            expect(element.src).toBe(TRACKS.completion);
            expect(element.loop).toBe(false);
            expect(element.volume).toBe(DEFAULT_AUDIO_PREFERENCES.completionVolume);
            expect(element.currentTime).toBe(0);
            expect(element.play).toHaveBeenCalledTimes(1);
            expect(element.paused).toBe(false);

            // The background uses a different element, so the chime can overlap.
            service.updateTimerState('FOCUSING');
            expect(created).toHaveLength(2);
            expect(created[0]).not.toBe(created[1]);
        });

        it('does nothing when the completion sound is disabled or silent', () => {
            const disabled = createService({ completionSoundEnabled: false });
            disabled.playCompletionSound();
            expect(created).toHaveLength(0);

            const silent = createService({ completionVolume: 0 });
            silent.playCompletionSound();
            expect(created).toHaveLength(0);
        });

        it('reports a completion chime failure without throwing', () => {
            const element = createFakeAudio();
            element.play.mockImplementation(() => {
                throw new Error('boom');
            });
            const service = createService({}, () => element);

            expect(() => service.playCompletionSound()).not.toThrow();
            expect(feedback).toEqual([
                { kind: 'asset-error', message: 'The completion sound could not be played.' },
            ]);
        });

        it('reports when the completion element emits an error event', () => {
            const service = createService();
            service.playCompletionSound();
            const element = created[0];
            expect(element.errorHandlers).toHaveLength(1);

            element.errorHandlers[0]();

            expect(feedback).toEqual([
                { kind: 'asset-error', message: 'The completion sound could not be played.' },
            ]);
        });
    });

    describe('preferences and lifecycle', () => {
        it('re-fades the audible background when the background volume changes', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, backgroundVolume: 0.7 });
            vi.advanceTimersByTime(FADE_DURATION_MS);

            expect(created[0].volume).toBeCloseTo(0.7, 5);
        });

        it('stops the background when its enable toggle is turned off', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);

            service.setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, focusMusicEnabled: false });

            const element = created[0];
            expect(element.paused).toBe(true);
            expect(element.volume).toBe(0);
            expect(element.currentTime).toBe(0);
        });

        it('does not re-play when the same track is already audible at the target volume', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');
            vi.advanceTimersByTime(FADE_DURATION_MS);
            expect(created[0].play).toHaveBeenCalledTimes(1);

            service.updateTimerState('FOCUSING');
            expect(created[0].play).toHaveBeenCalledTimes(1);
        });

        it('dispose is idempotent and stops playback; later updates are no-ops', () => {
            const service = createService();
            service.updateTimerState('FOCUSING');

            service.dispose();
            service.dispose();
            service.updateTimerState('FOCUSING');

            const element = created[0];
            expect(element.pause).toHaveBeenCalled();
            expect(element.play).toHaveBeenCalledTimes(1);
            expect(() => service.dispose()).not.toThrow();
        });
    });
});
