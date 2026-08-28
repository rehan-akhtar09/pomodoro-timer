import {
    DEFAULT_AUDIO_PREFERENCES,
    type AudioPreferences,
    type AudioPreferencesValidationErrors,
} from '../types/audio';
import { DEFAULT_TIMER_SETTINGS, type TimerSettings } from '../types/timer';
import type { SettingsValidationErrors } from '../types/settings';

/**
 * Settings validation — Pomodoro Bird (Phase 4).
 *
 * Implements rules.md §4 "Invalid settings": reject negative values, reject
 * zero where a positive duration is required, and apply safe defaults when
 * persisted data is corrupt. Validation never silently clamps — invalid input
 * is rejected and reported to the caller.
 */

/** Whether a value is a finite number greater than zero. */
export function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Whether a value is a positive whole number (used for session counts). */
export function isPositiveInteger(value: unknown): value is number {
    return isPositiveNumber(value) && Number.isInteger(value);
}

/**
 * Validate a full TimerSettings object. Returns `valid: false` with a
 * field-level error map when anything is missing or out of range.
 */
export function validateSettings(value: unknown): {
    valid: boolean;
    errors: SettingsValidationErrors;
} {
    if (!value || typeof value !== 'object') {
        return { valid: false, errors: { focusDuration: 'Settings are missing.' } };
    }

    const s = value as Partial<Record<keyof TimerSettings, unknown>>;
    const errors: SettingsValidationErrors = {};

    if (!isPositiveNumber(s.focusDuration)) {
        errors.focusDuration = 'Focus duration must be greater than zero.';
    }
    if (!isPositiveNumber(s.shortBreakDuration)) {
        errors.shortBreakDuration = 'Short break must be greater than zero.';
    }
    if (!isPositiveNumber(s.longBreakDuration)) {
        errors.longBreakDuration = 'Long break must be greater than zero.';
    }
    if (!isPositiveInteger(s.sessionsBeforeLongBreak)) {
        errors.sessionsBeforeLongBreak =
            'Sessions before long break must be a positive whole number.';
    }
    if (typeof s.autoStartBreaks !== 'boolean') {
        errors.autoStartBreaks = 'Invalid auto-start setting.';
    }
    if (typeof s.autoStartFocus !== 'boolean') {
        errors.autoStartFocus = 'Invalid auto-start setting.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Safely coerce unknown persisted data into valid TimerSettings. Corrupt or
 * incomplete data falls back to the in-memory defaults (never throws, per
 * rules.md §4) and is logged during development.
 */
export function toValidSettings(value: unknown): TimerSettings {
    const { valid, errors } = validateSettings(value);
    if (!valid) {
        console.warn('[settings] ignoring invalid persisted settings.', errors);
        return { ...DEFAULT_TIMER_SETTINGS };
    }
    return value as TimerSettings;
}

/** Whether a value is a finite number within an inclusive range (used for volumes). */
function isNumberInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Validate a full AudioPreferences object. Invalid fields produce a
 * field-level error map; the caller can then fall back to safe defaults.
 */
export function validateAudioPreferences(value: unknown): {
    valid: boolean;
    errors: AudioPreferencesValidationErrors;
} {
    if (!value || typeof value !== 'object') {
        return { valid: false, errors: { backgroundVolume: 'Audio preferences are missing.' } };
    }

    const a = value as Partial<Record<keyof AudioPreferences, unknown>>;
    const errors: AudioPreferencesValidationErrors = {};

    if (typeof a.focusMusicEnabled !== 'boolean') {
        errors.focusMusicEnabled = 'Invalid audio setting.';
    }
    if (typeof a.breakMusicEnabled !== 'boolean') {
        errors.breakMusicEnabled = 'Invalid audio setting.';
    }
    if (!isNumberInRange(a.backgroundVolume, 0, 1)) {
        errors.backgroundVolume = 'Background volume must be between 0 and 1.';
    }
    if (typeof a.completionSoundEnabled !== 'boolean') {
        errors.completionSoundEnabled = 'Invalid audio setting.';
    }
    if (!isNumberInRange(a.completionVolume, 0, 1)) {
        errors.completionVolume = 'Completion volume must be between 0 and 1.';
    }
    if (a.pauseBehavior !== 'pause' && a.pauseBehavior !== 'fade') {
        errors.pauseBehavior = 'Invalid pause behavior.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Safely coerce unknown persisted data into valid AudioPreferences. Corrupt or
 * incomplete data falls back to the in-memory defaults (never throws, per
 * rules.md §4 — storage errors / invalid settings).
 */
export function toValidAudioPreferences(value: unknown): AudioPreferences {
    const { valid, errors } = validateAudioPreferences(value);
    if (!valid) {
        console.warn('[audio] ignoring invalid persisted audio preferences.', errors);
        return { ...DEFAULT_AUDIO_PREFERENCES };
    }
    return value as AudioPreferences;
}
