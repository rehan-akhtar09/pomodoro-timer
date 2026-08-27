/**
 * SettingsPanel — Phase 4 settings form.
 *
 * Reads/writes ONLY through the useSettings hook (architecture.md §3 — the
 * panel never touches the Storage Service directly). Durations are entered in
 * minutes and converted to the seconds that TimerSettings stores. Input is
 * validated before it reaches TimerSettings: negative or zero values are
 * rejected with inline errors and never silently clamped (rules.md §4). A
 * failed persist surfaces the calm design.md §13 message while the timer keeps
 * working in memory.
 */

import { useState, type FormEvent } from 'react';
import type { SettingsValidationErrors } from '../../types/settings';
import type { TimerSettings } from '../../types/timer';
import { validateSettings } from '../../utils/validation';
import './SettingsPanel.css';

interface SettingsPanelProps {
    settings: TimerSettings;
    /** True when the last persist attempt failed (from useSettings). */
    saveFailed: boolean;
    updateSettings: (next: TimerSettings) => boolean;
}

interface DraftState {
    focusMinutes: string;
    shortBreakMinutes: string;
    longBreakMinutes: string;
    sessionsBeforeLongBreak: string;
}

interface NumberFieldProps {
    id: string;
    label: string;
    value: string;
    inputMode: 'decimal' | 'numeric';
    step: string;
    min: string;
    onChange: (value: string) => void;
    error?: string;
    hint?: string;
}

/** TimerSettings stores durations in seconds; the form edits minutes. */
function minutesOf(seconds: number): string {
    return String(seconds / 60);
}

const SAVE_FAILED_MESSAGE =
    "We couldn't save your settings. Your timer will keep working, but changes may not persist.";

/** Render one labelled number input with an inline error or hint below it. */
function NumberField({
    id,
    label,
    value,
    inputMode,
    step,
    min,
    onChange,
    error,
    hint,
}: NumberFieldProps) {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
        <div className="settings-panel__field">
            <label className="settings-panel__label" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                className="settings-panel__input"
                type="number"
                inputMode={inputMode}
                min={min}
                step={step}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
            />
            {error && (
                <p id={`${id}-error`} className="settings-panel__error" role="alert">
                    {error}
                </p>
            )}
            {!error && hint && (
                <p id={`${id}-hint`} className="settings-panel__hint">
                    {hint}
                </p>
            )}
        </div>
    );
}

/** Build TimerSettings from the draft, returning any field-level errors. */
function buildSettings(
    draft: DraftState,
    autoStartBreaks: boolean,
    autoStartFocus: boolean,
): { settings: TimerSettings; errors: SettingsValidationErrors } {
    const next: TimerSettings = {
        focusDuration: Number(draft.focusMinutes) * 60,
        shortBreakDuration: Number(draft.shortBreakMinutes) * 60,
        longBreakDuration: Number(draft.longBreakMinutes) * 60,
        sessionsBeforeLongBreak: Number(draft.sessionsBeforeLongBreak),
        autoStartBreaks,
        autoStartFocus,
    };
    const { errors } = validateSettings(next);
    return { settings: next, errors };
}

export function SettingsPanel({ settings, saveFailed, updateSettings }: SettingsPanelProps) {
    const [draft, setDraft] = useState<DraftState>(() => ({
        focusMinutes: minutesOf(settings.focusDuration),
        shortBreakMinutes: minutesOf(settings.shortBreakDuration),
        longBreakMinutes: minutesOf(settings.longBreakDuration),
        sessionsBeforeLongBreak: String(settings.sessionsBeforeLongBreak),
    }));
    const [autoStartBreaks, setAutoStartBreaks] = useState(settings.autoStartBreaks);
    const [autoStartFocus, setAutoStartFocus] = useState(settings.autoStartFocus);
    const [errors, setErrors] = useState<SettingsValidationErrors>({});

    const setMinutes = (patch: Partial<DraftState>) => {
        setDraft((current) => ({ ...current, ...patch }));
        setErrors({});
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { settings: next, errors: nextErrors } = buildSettings(
            draft,
            autoStartBreaks,
            autoStartFocus,
        );
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        setErrors({});
        if (!updateSettings(next)) {
            // Defensive: the hook validates identically, so this only fires on an
            // unexpected rejection. Keep the message calm and non-technical.
            setErrors({ focusDuration: 'Those settings could not be saved. Please try again.' });
        }
    };

    return (
        <section className="settings-panel" aria-label="Timer settings">
            <h2 className="settings-panel__title">Settings</h2>
            <p className="settings-panel__note">Changes apply to your next session.</p>

            <form className="settings-panel__form" onSubmit={handleSubmit} noValidate>
                <fieldset className="settings-panel__group">
                    <legend className="settings-panel__legend">Durations (minutes)</legend>

                    <NumberField
                        id="settings-focus"
                        label="Focus"
                        value={draft.focusMinutes}
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        onChange={(value) => setMinutes({ focusMinutes: value })}
                        error={errors.focusDuration}
                    />

                    <NumberField
                        id="settings-short-break"
                        label="Short break"
                        value={draft.shortBreakMinutes}
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        onChange={(value) => setMinutes({ shortBreakMinutes: value })}
                        error={errors.shortBreakDuration}
                    />

                    <NumberField
                        id="settings-long-break"
                        label="Long break"
                        value={draft.longBreakMinutes}
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        onChange={(value) => setMinutes({ longBreakMinutes: value })}
                        error={errors.longBreakDuration}
                    />

                    <NumberField
                        id="settings-sessions-before-long-break"
                        label="Sessions before long break"
                        value={draft.sessionsBeforeLongBreak}
                        inputMode="numeric"
                        step="1"
                        min="1"
                        onChange={(value) => setMinutes({ sessionsBeforeLongBreak: value })}
                        error={errors.sessionsBeforeLongBreak}
                    />
                </fieldset>

                <fieldset className="settings-panel__group">
                    <legend className="settings-panel__legend">Auto-start</legend>

                    <div className="settings-panel__toggle">
                        <label
                            className="settings-panel__toggle-label"
                            htmlFor="settings-auto-breaks"
                        >
                            <input
                                id="settings-auto-breaks"
                                type="checkbox"
                                checked={autoStartBreaks}
                                onChange={(event) => setAutoStartBreaks(event.target.checked)}
                            />
                            <span>Start breaks automatically</span>
                        </label>
                    </div>

                    <div className="settings-panel__toggle">
                        <label
                            className="settings-panel__toggle-label"
                            htmlFor="settings-auto-focus"
                        >
                            <input
                                id="settings-auto-focus"
                                type="checkbox"
                                checked={autoStartFocus}
                                onChange={(event) => setAutoStartFocus(event.target.checked)}
                            />
                            <span>Start focus sessions automatically</span>
                        </label>
                    </div>
                </fieldset>

                <div className="settings-panel__actions">
                    <button type="submit" className="settings-panel__save">
                        Save settings
                    </button>
                </div>
            </form>

            {saveFailed && (
                <p className="settings-panel__save-failed" role="status">
                    {SAVE_FAILED_MESSAGE}
                </p>
            )}
        </section>
    );
}
