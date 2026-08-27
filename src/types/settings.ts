import type { TimerSettings } from './timer';

/**
 * Settings types — Pomodoro Bird (Phase 4).
 *
 * `TimerSettings` (types/timer.ts) remains the single source of truth for the
 * settings shape; this module adds the validation vocabulary used by the
 * Settings Panel and the useSettings hook.
 */

/** Field-level validation errors keyed by TimerSettings field. */
export type SettingsValidationErrors = Partial<Record<keyof TimerSettings, string>>;
