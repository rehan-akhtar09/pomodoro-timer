import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAudioPreferences } from '../../src/hooks/useAudioPreferences';
import { storageService, STORAGE_KEYS } from '../../src/services/storage/storageService';
import { DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '../../src/types/audio';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useAudioPreferences', () => {
    it('loads persisted audio preferences on mount', () => {
        const persisted: AudioPreferences = {
            ...DEFAULT_AUDIO_PREFERENCES,
            backgroundVolume: 0.7,
            completionVolume: 0.8,
        };
        vi.spyOn(storageService, 'get').mockImplementation(() => persisted);

        const { result } = renderHook(() => useAudioPreferences());

        expect(result.current.prefs).toEqual(persisted);
    });

    it('falls back to defaults when persisted data is missing or corrupt', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(storageService, 'get').mockImplementation(() => null);

        const { result } = renderHook(() => useAudioPreferences());

        expect(result.current.prefs).toEqual(DEFAULT_AUDIO_PREFERENCES);
    });

    it('persists changes through the storage service', () => {
        vi.spyOn(storageService, 'get').mockImplementation(() => null);
        const setSpy = vi.spyOn(storageService, 'set').mockReturnValue(true);

        const { result } = renderHook(() => useAudioPreferences());

        const next: AudioPreferences = {
            ...DEFAULT_AUDIO_PREFERENCES,
            backgroundVolume: 0.6,
        };
        act(() => {
            const accepted = result.current.updateAudioPreferences(next);
            expect(accepted).toBe(true);
        });

        expect(result.current.prefs).toEqual(next);
        expect(setSpy).toHaveBeenCalledWith(STORAGE_KEYS.audioPreferences, next);
    });

    it('rejects invalid values without changing state or persisting', () => {
        vi.spyOn(storageService, 'get').mockImplementation(() => null);
        const setSpy = vi.spyOn(storageService, 'set').mockReturnValue(true);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const { result } = renderHook(() => useAudioPreferences());

        // A volume outside the 0..1 range is invalid.
        act(() => {
            const rejected = result.current.updateAudioPreferences({
                ...DEFAULT_AUDIO_PREFERENCES,
                completionVolume: 1.5,
            });
            expect(rejected).toBe(false);
        });

        // An unknown pause behavior is invalid.
        act(() => {
            const rejected = result.current.updateAudioPreferences({
                ...DEFAULT_AUDIO_PREFERENCES,
                pauseBehavior: 'stop',
            } as unknown as AudioPreferences);
            expect(rejected).toBe(false);
        });

        expect(result.current.prefs).toEqual(DEFAULT_AUDIO_PREFERENCES);
        expect(setSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            '[audio] rejected invalid audio preferences update.',
            expect.anything(),
        );
    });
});
