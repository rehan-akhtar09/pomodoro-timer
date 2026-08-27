import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../../src/hooks/useSettings';
import { storageService, STORAGE_KEYS } from '../../src/services/storage/storageService';
import { DEFAULT_TIMER_SETTINGS, type TimerSettings } from '../../src/types/timer';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useSettings', () => {
    it('loads persisted settings on mount', () => {
        const persisted: TimerSettings = {
            ...DEFAULT_TIMER_SETTINGS,
            focusDuration: 10 * 60,
            sessionsBeforeLongBreak: 2,
        };
        vi.spyOn(storageService, 'get').mockImplementation(() => persisted);

        const { result } = renderHook(() => useSettings());

        expect(result.current.settings).toEqual(persisted);
    });

    it('falls back to defaults when persisted data is missing or corrupt', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(storageService, 'get').mockImplementation(() => null);

        const { result } = renderHook(() => useSettings());

        expect(result.current.settings).toEqual(DEFAULT_TIMER_SETTINGS);
    });

    it('persists changes through the storage service', () => {
        vi.spyOn(storageService, 'get').mockImplementation(() => null);
        const setSpy = vi.spyOn(storageService, 'set').mockReturnValue(true);

        const { result } = renderHook(() => useSettings());

        const next: TimerSettings = { ...DEFAULT_TIMER_SETTINGS, focusDuration: 30 * 60 };
        act(() => {
            const accepted = result.current.updateSettings(next);
            expect(accepted).toBe(true);
        });

        expect(result.current.settings).toEqual(next);
        expect(setSpy).toHaveBeenCalledWith(STORAGE_KEYS.settings, next);
    });

    it('rejects negative and zero durations without changing state', () => {
        vi.spyOn(storageService, 'get').mockImplementation(() => null);
        const setSpy = vi.spyOn(storageService, 'set').mockReturnValue(true);

        const { result } = renderHook(() => useSettings());

        act(() => {
            const rejected = result.current.updateSettings({
                ...DEFAULT_TIMER_SETTINGS,
                focusDuration: 0,
            });
            expect(rejected).toBe(false);
        });

        act(() => {
            const rejected = result.current.updateSettings({
                ...DEFAULT_TIMER_SETTINGS,
                shortBreakDuration: -5,
            });
            expect(rejected).toBe(false);
        });

        expect(result.current.settings).toEqual(DEFAULT_TIMER_SETTINGS);
        expect(setSpy).not.toHaveBeenCalled();
    });
});
