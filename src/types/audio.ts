/**
 * Audio preference types — Pomodoro Bird (Phase 5).
 *
 * Shape of the persisted audio preferences (architecture.md §5 — persistence).
 * Kept separate from `TimerSettings`: audio is an optional, device-local
 * enhancement and must never block or alter timer behavior (rules.md — audio).
 * All playback decisions flow from these preferences through the Audio Service.
 */

/** How background music should behave when the timer is paused (architecture.md §3). */
export type AudioPauseBehavior = 'pause' | 'fade';

/** Persisted audio preferences (validated on load via toValidAudioPreferences). */
export interface AudioPreferences {
    /** Loop the focus track while a focus session is running. */
    focusMusicEnabled: boolean;
    /** Loop the break/ambient track while a break session is running. */
    breakMusicEnabled: boolean;
    /** Background music volume, 0..1 inclusive. */
    backgroundVolume: number;
    /** Play a short completion chime when a session completes. */
    completionSoundEnabled: boolean;
    /** Completion chime volume, 0..1 inclusive. */
    completionVolume: number;
    /** Pause behavior: keep the track paused, or gently fade it out. */
    pauseBehavior: AudioPauseBehavior;
}

/**
 * Default audio preferences. Audio is an optional enhancement (design.md —
 * Audio & Cozy Soundscape), so defaults are gentle, never loud, and never
 * required for the timer to function. Autoplay restrictions additionally mean
 * no sound plays until the user interacts with the timer.
 */
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
    focusMusicEnabled: true,
    breakMusicEnabled: true,
    backgroundVolume: 0.4,
    completionSoundEnabled: true,
    completionVolume: 0.6,
    pauseBehavior: 'fade',
};

/** Field-level validation errors keyed by AudioPreferences field. */
export type AudioPreferencesValidationErrors = Partial<Record<keyof AudioPreferences, string>>;
