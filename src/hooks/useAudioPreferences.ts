/**
 * useAudioPreferences — React binding around persisted audio preferences
 * (Phase 5). Mirrors useSettings: lazy-loads once, falls back to calm defaults
 * on corrupt/missing data, persists changes through the Storage Service (no
 * second storage mechanism — rules.md), and surfaces a `saveFailed` flag
 * instead of throwing when storage is unavailable.
 *
 * Audio preferences are device-local and optional; they never affect whether
 * the timer runs.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { storageService, STORAGE_KEYS } from '../services/storage/storageService';
import type { AudioPreferences } from '../types/audio';
import { toValidAudioPreferences, validateAudioPreferences } from '../utils/validation';

export interface UseAudioPreferencesResult {
    /** Current validated audio preferences (defaults until changed). */
    prefs: AudioPreferences;
    /** True when the most recent persist attempt failed (storage unavailable). */
    saveFailed: boolean;
    /**
     * Replace the audio preferences. Returns false (state untouched) when the
     * value is invalid — the caller surfaces the field errors instead.
     */
    updateAudioPreferences: (next: AudioPreferences) => boolean;
}

export function useAudioPreferences(): UseAudioPreferencesResult {
    const [prefs, setPrefs] = useState<AudioPreferences>(() =>
        toValidAudioPreferences(storageService.get(STORAGE_KEYS.audioPreferences)),
    );

    const [saveFailed, setSaveFailed] = useState(false);

    // Skip the no-op first-render write (mirrors useSettings).
    const skipFirstPersistRef = useRef(true);

    useEffect(() => {
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        setSaveFailed(!storageService.set(STORAGE_KEYS.audioPreferences, prefs));
    }, [prefs]);

    const updateAudioPreferences = useCallback((next: AudioPreferences): boolean => {
        const { valid, errors } = validateAudioPreferences(next);
        if (!valid) {
            console.warn('[audio] rejected invalid audio preferences update.', errors);
            return false;
        }
        setPrefs(next);
        return true;
    }, []);

    return { prefs, saveFailed, updateAudioPreferences };
}
