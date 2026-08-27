/**
 * useSettings — React binding around persisted timer settings (Phase 4).
 *
 * Loads once on mount (lazy init) and falls back to the built-in defaults when
 * storage is missing or corrupt (rules.md §4 — invalid settings). Changes are
 * persisted through the Storage Service; a failed write (quota exceeded,
 * private mode, disabled storage) never throws — it surfaces a calm
 * `saveFailed` flag so the UI can keep the timer working in memory while
 * telling the user the change may not stick (design.md §13).
 *
 * Updates are validated before they reach state: invalid input is rejected and
 * never silently clamped (rules.md §4 / phase.md Phase 4).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { storageService, STORAGE_KEYS } from '../services/storage/storageService';
import type { TimerSettings } from '../types/timer';
import { toValidSettings, validateSettings } from '../utils/validation';

export interface UseSettingsResult {
    /** The current validated settings (defaults until the user changes them). */
    settings: TimerSettings;
    /** True when the most recent persist attempt failed (storage unavailable). */
    saveFailed: boolean;
    /**
     * Replace the settings. Returns false (and leaves state untouched) when the
     * value is invalid — the caller should surface the field errors instead.
     */
    updateSettings: (next: TimerSettings) => boolean;
}

export function useSettings(): UseSettingsResult {
    // Lazy init reads storage exactly once on mount; corrupt/missing data falls
    // back to the in-memory defaults without throwing.
    const [settings, setSettings] = useState<TimerSettings>(() =>
        toValidSettings(storageService.get(STORAGE_KEYS.settings)),
    );

    const [saveFailed, setSaveFailed] = useState(false);

    // The persist effect would otherwise rewrite the just-loaded value on the
    // first render; skip that no-op write so a fresh user never sees an error
    // just because storage is unavailable.
    const skipFirstPersistRef = useRef(true);

    useEffect(() => {
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        setSaveFailed(!storageService.set(STORAGE_KEYS.settings, settings));
    }, [settings]);

    const updateSettings = useCallback((next: TimerSettings): boolean => {
        const { valid, errors } = validateSettings(next);
        if (!valid) {
            console.warn('[settings] rejected invalid settings update.', errors);
            return false;
        }
        setSettings(next);
        return true;
    }, []);

    return { settings, saveFailed, updateSettings };
}
