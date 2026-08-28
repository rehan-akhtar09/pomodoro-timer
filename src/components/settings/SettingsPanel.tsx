/**
 * SettingsPanel — Phase 4 settings form + Phase 5 Sound & Accessibility.
 *
 * The timer form reads/writes ONLY through the useSettings hook
 * (architecture.md §3 — the panel never touches the Storage Service directly).
 * Durations are entered in minutes and converted to the seconds that
 * TimerSettings stores. Input is validated before it reaches TimerSettings:
 * negative or zero values are rejected with inline errors and never silently
 * clamped (rules.md §4). A failed persist surfaces the calm design.md §13
 * message while the timer keeps working in memory.
 *
 * Sound & Accessibility (Phase 5) live OUTSIDE the form because they apply
 * immediately: audio toggles/volumes persist through useAudioPreferences and
 * flow straight to the Audio Service, and the notification permission request
 * must come from a direct user interaction (rules.md — autoplay/permission).
 * Reduced motion intentionally follows the operating-system setting
 * (usePrefersReducedMotion) with no separate persisted toggle.
 */

import { useState, type FormEvent } from 'react';
import type {
    AuthActionResult,
    AuthUserInfo,
    SimpleAuthResult,
} from '../../services/auth/authService';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { AudioPreferences } from '../../types/audio';
import type { SettingsValidationErrors } from '../../types/settings';
import type { TimerSettings } from '../../types/timer';
import { validateSettings } from '../../utils/validation';
import './SettingsPanel.css';

/**
 * The optional account layer handed down from the App shell (useAuth). When
 * `available` is false the account UI degrades to a quiet note and the app
 * keeps running fully local-only (PRD.md §5 P2).
 */
export interface AccountProps {
    user: AuthUserInfo | null;
    /** True while an auth action is in flight. */
    busy: boolean;
    /** False when Firebase Auth is not configured on this device. */
    available: boolean;
    createAccount: (email: string, password: string) => Promise<AuthActionResult>;
    signIn: (email: string, password: string) => Promise<AuthActionResult>;
    signOut: () => Promise<SimpleAuthResult>;
    sendPasswordReset: (email: string) => Promise<SimpleAuthResult>;
}

interface SettingsPanelProps {
    settings: TimerSettings;
    /** True when the last persist attempt failed (from useSettings). */
    saveFailed: boolean;
    updateSettings: (next: TimerSettings) => boolean;
    /** Current audio preferences (applied immediately by the Sound section). */
    audioPreferences: AudioPreferences;
    /** True when the last audio preference persist failed (from useAudioPreferences). */
    audioSaveFailed: boolean;
    updateAudioPreferences: (next: AudioPreferences) => boolean;
    account: AccountProps;
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

const AUDIO_SAVE_FAILED_MESSAGE =
    "We couldn't save your sound settings. Your timer will keep working, but changes may not persist.";

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

interface AccountMessage {
    kind: 'ok' | 'error';
    text: string;
}

interface AccountSectionProps {
    account: AccountProps;
}

type AccountActionResult = { ok: boolean; error?: string | null };

/**
 * Minimal account UI (rules.md Firebase sections — no secrets here, all auth
 * goes through the authService). Signed-out: email/password forms for sign-in,
 * account creation and password reset. Signed-in: calm status + sign out. When
 * Firebase is not configured the section degrades to a quiet note and the app
 * keeps running fully local-only (design.md §13).
 */
function AccountSection({ account }: AccountSectionProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<AccountMessage | null>(null);

    const run = async (action: () => Promise<AccountActionResult>, okText: string) => {
        setMessage(null);
        const result = await action();
        if (result.ok) {
            setPassword('');
            setMessage({ kind: 'ok', text: okText });
        } else {
            setMessage({
                kind: 'error',
                text: result.error ?? 'Something went wrong. Please try again.',
            });
        }
    };

    if (!account.available) {
        return (
            <p className="settings-panel__account-note">
                Cloud sync is not configured on this device — your data stays on this device only.
            </p>
        );
    }

    if (account.user !== null) {
        return (
            <div className="settings-panel__account">
                <p className="settings-panel__account-email">
                    Signed in as <strong>{account.user.email ?? account.user.uid}</strong>
                </p>
                <button
                    type="button"
                    className="settings-panel__account-button"
                    disabled={account.busy}
                    onClick={() =>
                        void run(() => account.signOut(), 'Signed out. Your data stays on this device.')
                    }
                >
                    Sign out
                </button>
            </div>
        );
    }

    const canSubmit = email.trim() !== '' && password.length > 0;

    return (
        <div className="settings-panel__account">
            <div className="settings-panel__field">
                <label className="settings-panel__label" htmlFor="account-email">
                    Email
                </label>
                <input
                    id="account-email"
                    className="settings-panel__input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />
            </div>
            <div className="settings-panel__field">
                <label className="settings-panel__label" htmlFor="account-password">
                    Password
                </label>
                <input
                    id="account-password"
                    className="settings-panel__input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />
            </div>
            <div className="settings-panel__account-actions">
                <button
                    type="button"
                    className="settings-panel__account-button"
                    disabled={account.busy || !canSubmit}
                    onClick={() =>
                        void run(
                            () => account.signIn(email.trim(), password),
                            'Signed in — syncing your data.',
                        )
                    }
                >
                    Sign in
                </button>
                <button
                    type="button"
                    className="settings-panel__account-button"
                    disabled={account.busy || !canSubmit}
                    onClick={() =>
                        void run(
                            () => account.createAccount(email.trim(), password),
                            'Account created — you are signed in.',
                        )
                    }
                >
                    Create account
                </button>
                <button
                    type="button"
                    className="settings-panel__account-link"
                    disabled={account.busy || email.trim() === ''}
                    onClick={() =>
                        void run(
                            () => account.sendPasswordReset(email.trim()),
                            'Password reset email sent.',
                        )
                    }
                >
                    Send password reset
                </button>
            </div>
            {message !== null && (
                <p
                    className={`settings-panel__account-message settings-panel__account-message--${message.kind}`}
                    role="status"
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}

interface VolumeFieldProps {
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
}

/** One labelled 0..1 volume slider with a readable percentage value. */
function VolumeField({ id, label, value, onChange }: VolumeFieldProps) {
    const percent = Math.round(value * 100);
    return (
        <div className="settings-panel__field">
            <div className="settings-panel__volume-label">
                <label className="settings-panel__label" htmlFor={id}>
                    {label}
                </label>
                <span className="settings-panel__volume-value" aria-hidden="true">
                    {percent}%
                </span>
            </div>
            <input
                id={id}
                className="settings-panel__range"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                aria-valuetext={`${percent}%`}
            />
        </div>
    );
}

/**
 * Optional browser-notification permission control (PRD.md — Notifications).
 * The request runs from this button's click — a direct user interaction — and
 * the service never throws, so all outcomes are calm status text (design.md §13).
 */
function NotificationControl() {
    const { permission, requesting, request } = useNotificationPermission();

    if (permission === 'granted') {
        return (
            <p className="settings-panel__status settings-panel__status--ok">
                Notifications are on.
            </p>
        );
    }

    if (permission === 'denied' || permission === 'request-denied') {
        return (
            <p className="settings-panel__hint">
                Notifications are blocked in your browser settings.
            </p>
        );
    }

    if (permission === 'unsupported') {
        return (
            <p className="settings-panel__hint">Notifications aren't supported in this browser.</p>
        );
    }

    // 'default' (never asked) or 'request-error' (ask again).
    const failed = permission === 'request-error';
    return (
        <div className="settings-panel__notification">
            {failed ? (
                <p className="settings-panel__hint">
                    We couldn't ask for notification permission. You can try again.
                </p>
            ) : (
                <p className="settings-panel__hint">
                    Get a gentle reminder when a session completes.
                </p>
            )}
            <button
                type="button"
                className="settings-panel__account-button"
                disabled={requesting}
                onClick={() => void request()}
            >
                {requesting ? 'Asking…' : 'Enable notifications'}
            </button>
        </div>
    );
}

interface SoundSectionProps {
    audioPreferences: AudioPreferences;
    audioSaveFailed: boolean;
    updateAudioPreferences: (next: AudioPreferences) => boolean;
}

/**
 * Sound & Cozy Soundscape preferences (design.md §16). Unlike the timer form,
 * these apply immediately — no Save step — because the Audio Service reads them
 * live and they are optional enhancements that never block the timer.
 */
function SoundSection({ audioPreferences, audioSaveFailed, updateAudioPreferences }: SoundSectionProps) {
    const setAudioPref = (patch: Partial<AudioPreferences>) => {
        updateAudioPreferences({ ...audioPreferences, ...patch });
    };

    return (
        <div className="settings-panel__section">
            <h3 className="settings-panel__legend">Sound</h3>
            <div className="settings-panel__sound">
                <div className="settings-panel__toggle">
                    <label className="settings-panel__toggle-label" htmlFor="audio-focus-music">
                        <input
                            id="audio-focus-music"
                            type="checkbox"
                            checked={audioPreferences.focusMusicEnabled}
                            onChange={(event) =>
                                setAudioPref({ focusMusicEnabled: event.target.checked })
                            }
                        />
                        <span>Focus music</span>
                    </label>
                </div>

                <VolumeField
                    id="audio-background-volume"
                    label="Background volume"
                    value={audioPreferences.backgroundVolume}
                    onChange={(value) => setAudioPref({ backgroundVolume: value })}
                />

                <div className="settings-panel__toggle">
                    <label className="settings-panel__toggle-label" htmlFor="audio-break-music">
                        <input
                            id="audio-break-music"
                            type="checkbox"
                            checked={audioPreferences.breakMusicEnabled}
                            onChange={(event) =>
                                setAudioPref({ breakMusicEnabled: event.target.checked })
                            }
                        />
                        <span>Break music</span>
                    </label>
                </div>

                <div className="settings-panel__toggle">
                    <label className="settings-panel__toggle-label" htmlFor="audio-completion-sound">
                        <input
                            id="audio-completion-sound"
                            type="checkbox"
                            checked={audioPreferences.completionSoundEnabled}
                            onChange={(event) =>
                                setAudioPref({ completionSoundEnabled: event.target.checked })
                            }
                        />
                        <span>Completion sound</span>
                    </label>
                </div>

                <VolumeField
                    id="audio-completion-volume"
                    label="Completion volume"
                    value={audioPreferences.completionVolume}
                    onChange={(value) => setAudioPref({ completionVolume: value })}
                />

                <div className="settings-panel__toggle">
                    <label className="settings-panel__toggle-label" htmlFor="audio-pause-fade">
                        <input
                            id="audio-pause-fade"
                            type="checkbox"
                            checked={audioPreferences.pauseBehavior === 'fade'}
                            onChange={(event) =>
                                setAudioPref({
                                    pauseBehavior: event.target.checked ? 'fade' : 'pause',
                                })
                            }
                        />
                        <span>Gently fade music when paused</span>
                    </label>
                </div>

                <NotificationControl />
            </div>

            {audioSaveFailed && (
                <p className="settings-panel__save-failed" role="status">
                    {AUDIO_SAVE_FAILED_MESSAGE}
                </p>
            )}
        </div>
    );
}

/**
 * Accessibility (design.md §9/§12). Reduced motion intentionally follows the
 * operating-system setting rather than a persisted app toggle, so this section
 * reports the current state calmly instead of adding a control.
 */
function AccessibilitySection() {
    const reduced = usePrefersReducedMotion();

    return (
        <div className="settings-panel__section">
            <h3 className="settings-panel__legend">Accessibility</h3>
            <p className="settings-panel__hint">
                Reduced motion follows your system setting.{' '}
                <span className="settings-panel__status">
                    {reduced ? 'Motion: reduced' : 'Motion: standard'}
                </span>
            </p>
        </div>
    );
}

export function SettingsPanel({
    settings,
    saveFailed,
    updateSettings,
    audioPreferences,
    audioSaveFailed,
    updateAudioPreferences,
    account,
}: SettingsPanelProps) {
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

            <SoundSection
                audioPreferences={audioPreferences}
                audioSaveFailed={audioSaveFailed}
                updateAudioPreferences={updateAudioPreferences}
            />

            <AccessibilitySection />

            <div className="settings-panel__account-section">
                <h3 className="settings-panel__legend">Account</h3>
                <AccountSection account={account} />
            </div>
        </section>
    );
}
