/**
 * Audio Service — Pomodoro Bird (Phase 5).
 *
 * A small, framework-independent layer over native `<audio>` elements
 * (architecture.md §3 — Audio Service). It:
 *
 * - Follows the Audio State table (architecture.md §3):
 *   IDLE             → silence (no background audio)
 *   FOCUSING         → focus track, looping, if focus music is enabled
 *   SHORT/LONG_BREAK → break track, looping, if break music is enabled
 *   *_PAUSED         → pause or gently fade per the user's configured behavior
 *   COMPLETED        → fade out the background track (completion chime is
 *                      played separately via playCompletionSound)
 *
 * - Never modifies TimerState — it only *reads* state transitions and plays
 *   audio in response. The timer keeps running identically with or without it.
 *
 * - Isolates every playback failure (rules.md — autoplay): autoplay rejections
 *   and missing/corrupt assets never throw and never affect the timer. Blocked
 *   autoplay surfaces a calm onFeedback event and retries once on the next user
 *   gesture; failed assets stop silently without retry loops.
 *
 * - Prevents overlapping copies of the same track: one shared background
 *   element is reused and swapped between the focus and break tracks, so two
 *   instances of the same track can never play at once. The completion chime
 *   uses a separate element so it can ring while background music fades out.
 */

import { DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '../../types/audio';
import type { TimerState } from '../../types/timer';

/** Track URLs served from public/assets/audio (local, optimized assets). */
export interface AudioTrackUrls {
    focus: string;
    break: string;
    completion: string;
}

/** Non-fatal playback problems surfaced to the UI (never fatal to the timer). */
export type AudioFeedbackKind = 'autoplay-blocked' | 'asset-error';

export interface AudioServiceConfig {
    tracks: AudioTrackUrls;
    /** Injectable element factory (tests pass fakes). Defaults to `new Audio()`. */
    createAudio?: () => HTMLAudioElement;
    /** Called for non-fatal playback problems so the UI can show calm feedback. */
    onFeedback?: (kind: AudioFeedbackKind, message: string) => void;
}

/** Gentle, non-abrupt volume transitions (design.md — audio transitions). */
export const FADE_DURATION_MS = 800;
/** How often the fade ticker nudges the volume (smooth stepping). */
export const FADE_STEP_MS = 50;
/** Faster fade used when swapping between the focus and break tracks. */
export const SWITCH_FADE_MS = 400;

type BackgroundTrack = 'focus' | 'break';

/** True when a play() rejection is the browser blocking autoplay. */
function isAutoplayBlocked(error: unknown): boolean {
    if (error === null || typeof error !== 'object' || !('name' in error)) {
        return false;
    }
    const name = String((error as { name?: unknown }).name);
    return name === 'NotAllowedError';
}

export class AudioService {
    private readonly config: AudioServiceConfig;
    private readonly createAudio: () => HTMLAudioElement;

    private prefs: AudioPreferences;
    /** The single shared background element (focus and break swap through it). */
    private background: HTMLAudioElement | null = null;
    private completion: HTMLAudioElement | null = null;

    /** Track currently loaded in the background element (or null when silent). */
    private activeTrack: BackgroundTrack | null = null;
    /** Track autoplay blocked; retried once on the next user gesture. */
    private pendingTrack: BackgroundTrack | null = null;
    private fadeTimerId: number | null = null;
    private disposed = false;

    constructor(config: AudioServiceConfig) {
        this.config = config;
        this.createAudio = config.createAudio ?? (() => new Audio());
        this.prefs = { ...DEFAULT_AUDIO_PREFERENCES };
    }

    /** Update persisted audio preferences (enable flags, volumes, pause behavior). */
    setPreferences(prefs: AudioPreferences): void {
        this.prefs = { ...prefs };
        // Reflect a volume change on the currently audible background track.
        const bg = this.background;
        if (bg !== null && !bg.paused && bg.volume > 0) {
            this.fadeTo(bg, this.prefs.backgroundVolume, FADE_DURATION_MS);
        }
        // Toggling a track off while it is the active track stops it.
        if (this.activeTrack === 'focus' && !prefs.focusMusicEnabled) {
            this.stopBackground();
        } else if (this.activeTrack === 'break' && !prefs.breakMusicEnabled) {
            this.stopBackground();
        }
    }

    /**
     * Drive playback from timer state transitions (architecture.md §3 — Audio
     * State). Never throws; failures become onFeedback events. The mode is not
     * needed — every state already encodes which audio, if any, should play.
     */
    updateTimerState(state: TimerState): void {
        if (this.disposed) {
            return;
        }
        switch (state) {
            case 'IDLE':
                this.stopBackground();
                break;
            case 'FOCUSING':
                this.ensureTrack('focus');
                break;
            case 'SHORT_BREAK':
            case 'LONG_BREAK':
                this.ensureTrack('break');
                break;
            case 'FOCUS_PAUSED':
            case 'SHORT_BREAK_PAUSED':
            case 'LONG_BREAK_PAUSED':
                this.pauseBackground();
                break;
            case 'COMPLETED':
                this.fadeOutBackground();
                break;
        }
    }

    /**
     * Play the short completion chime (architecture.md §4 — completion flow).
     * Independent of background audio success: the chime may ring even if the
     * background track failed, and its failure never affects the timer.
     */
    playCompletionSound(): void {
        if (this.disposed) {
            return;
        }
        if (!this.prefs.completionSoundEnabled || this.prefs.completionVolume <= 0) {
            return;
        }
        const element = this.ensureCompletionElement();
        if (element === null) {
            return;
        }
        try {
            element.volume = this.prefs.completionVolume;
            element.currentTime = 0;
            element.src = this.config.tracks.completion;
            element.loop = false;
            this.safePlay(element, () =>
                this.report('asset-error', 'The completion sound could not be played.'),
            );
        } catch {
            this.report('asset-error', 'The completion sound could not be played.');
        }
    }

    /**
     * Called after a direct user interaction (click, key press). Retries a
     * background track that autoplay blocked — never assumes success, and never
     * retries in a loop (rules.md — autoplay).
     */
    notifyUserGesture(): void {
        if (this.disposed) {
            return;
        }
        const track = this.pendingTrack;
        if (track === null) {
            return;
        }
        this.pendingTrack = null;
        this.ensureTrack(track);
    }

    /** Stop all playback and release timers (app unmount). */
    dispose(): void {
        this.disposed = true;
        this.clearFade();
        this.pendingTrack = null;
        this.activeTrack = null;
        try {
            this.background?.pause();
            this.completion?.pause();
        } catch {
            // Audio element teardown must never throw.
        }
    }

    // --- Internals ----------------------------------------------------------

    /** Ensure the requested track is looping; reuse the shared element. */
    private ensureTrack(track: BackgroundTrack): void {
        const enabled =
            track === 'focus' ? this.prefs.focusMusicEnabled : this.prefs.breakMusicEnabled;
        if (!enabled) {
            this.stopBackground();
            return;
        }
        this.pendingTrack = null;

        if (this.activeTrack === track) {
            const element = this.background;
            if (element === null) {
                return;
            }
            // Already audible at the right volume — avoid a redundant play().
            if (!element.paused && element.volume === this.prefs.backgroundVolume) {
                return;
            }
            // Same track resuming (RESUME action or autoplay retry).
            this.safePlay(element, (error) => this.handlePlayFailure(track, error));
            this.fadeTo(element, this.prefs.backgroundVolume, FADE_DURATION_MS);
            return;
        }

        const element = this.ensureBackgroundElement();
        if (element === null) {
            return;
        }

        // Different track: fade the current one out gently, then swap the same
        // element (never two copies of the same track — rules.md — audio).
        const currentlyAudible = this.activeTrack !== null && element.volume > 0;
        if (currentlyAudible) {
            this.fadeTo(element, 0, SWITCH_FADE_MS, () => this.loadTrack(track, element));
        } else {
            this.loadTrack(track, element);
        }
    }

    /** Load `track` into the shared element, then play + fade in. */
    private loadTrack(track: BackgroundTrack, element: HTMLAudioElement): void {
        try {
            element.pause();
            element.currentTime = 0;
            element.volume = 0;
            element.src = track === 'focus' ? this.config.tracks.focus : this.config.tracks.break;
            element.loop = true;
            this.activeTrack = track;
            this.safePlay(element, (error) => this.handlePlayFailure(track, error));
            this.fadeTo(element, this.prefs.backgroundVolume, FADE_DURATION_MS);
        } catch {
            this.stopBackground();
            this.report('asset-error', 'Background sound is unavailable right now.');
        }
    }

    /** Pause behavior for the *_PAUSED states (user-configured). */
    private pauseBackground(): void {
        const element = this.background;
        if (element === null) {
            return;
        }
        if (this.prefs.pauseBehavior === 'pause') {
            this.clearFade();
            element.pause();
            element.volume = this.prefs.backgroundVolume;
            return;
        }
        this.fadeOutBackground();
    }

    /** Gently fade the background track out and pause it (COMPLETED / fade pause). */
    private fadeOutBackground(): void {
        const element = this.background;
        if (element === null) {
            return;
        }
        this.fadeTo(element, 0, FADE_DURATION_MS, () => {
            try {
                element.pause();
            } catch {
                // Pausing a corrupt/missing element must never throw outward.
            }
        });
    }

    /** Silently stop the background track entirely (IDLE, disable toggle, error). */
    private stopBackground(): void {
        this.clearFade();
        this.pendingTrack = null;
        this.activeTrack = null;
        const element = this.background;
        if (element === null) {
            return;
        }
        try {
            element.pause();
            element.currentTime = 0;
            element.volume = 0;
        } catch {
            // Element teardown must never throw outward.
        }
    }

    /** Handle a rejected play() without letting it reach the timer. */
    private handlePlayFailure(track: BackgroundTrack, error: unknown): void {
        if (this.disposed) {
            return;
        }
        if (isAutoplayBlocked(error)) {
            // Timer keeps running; audio retries once on the next user gesture.
            // Never a silent failure — surface calm in-app feedback.
            this.pendingTrack = track;
            this.report('autoplay-blocked', 'Sound will start after you interact with the page.');
            return;
        }
        if (String((error as { name?: unknown })?.name) === 'AbortError') {
            // Benign interruption (a newer play() superseded this one).
            return;
        }
        this.stopBackground();
        this.report('asset-error', 'Background sound is unavailable right now.');
    }

    private safePlay(element: HTMLAudioElement, onFailure: (error: unknown) => void): void {
        try {
            const result = element.play();
            if (result instanceof Promise) {
                result.catch(onFailure);
            }
        } catch (error) {
            onFailure(error);
        }
    }

    private ensureBackgroundElement(): HTMLAudioElement | null {
        if (this.background !== null) {
            return this.background;
        }
        try {
            const element = this.createAudio();
            element.preload = 'auto';
            if (typeof element.addEventListener === 'function') {
                element.addEventListener('error', () => {
                    this.stopBackground();
                    this.report('asset-error', 'Background sound is unavailable right now.');
                });
            }
            this.background = element;
            return element;
        } catch {
            this.report('asset-error', 'Audio is unavailable in this browser.');
            return null;
        }
    }

    private ensureCompletionElement(): HTMLAudioElement | null {
        if (this.completion !== null) {
            return this.completion;
        }
        try {
            const element = this.createAudio();
            element.preload = 'auto';
            if (typeof element.addEventListener === 'function') {
                element.addEventListener('error', () =>
                    this.report('asset-error', 'The completion sound could not be played.'),
                );
            }
            this.completion = element;
            return element;
        } catch {
            this.report('asset-error', 'The completion sound could not be played.');
            return null;
        }
    }

    /** Step-wise volume transition (gentle, deterministic for tests). */
    private fadeTo(
        element: HTMLAudioElement,
        target: number,
        durationMs: number,
        onComplete?: () => void,
    ): void {
        this.clearFade();
        const start = element.volume;
        if (start === target) {
            onComplete?.();
            return;
        }
        const stepCount = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
        let step = 0;
        this.fadeTimerId = window.setInterval(() => {
            step += 1;
            const progress = Math.min(1, step / stepCount);
            try {
                element.volume = start + (target - start) * progress;
            } catch {
                // A failing element must never break the fade ticker.
                this.clearFade();
                return;
            }
            if (progress >= 1) {
                this.clearFade();
                onComplete?.();
            }
        }, FADE_STEP_MS);
    }

    private clearFade(): void {
        if (this.fadeTimerId !== null) {
            window.clearInterval(this.fadeTimerId);
            this.fadeTimerId = null;
        }
    }

    private report(kind: AudioFeedbackKind, message: string): void {
        if (this.disposed) {
            return;
        }
        this.config.onFeedback?.(kind, message);
    }
}
