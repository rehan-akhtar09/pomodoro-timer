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
