import { describe, expect, it, vi } from 'vitest';
import { StorageService, type StorageBackend } from '../../src/services/storage/storageService';

/** In-memory backend standing in for window.localStorage in tests. */
function createMemoryBackend(initial: Record<string, string> = {}): StorageBackend {
    const store = new Map(Object.entries(initial));
    return {
        getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
        setItem: (key, value) => {
            store.set(key, value);
        },
        removeItem: (key) => {
            store.delete(key);
        },
    };
}

describe('storageService', () => {
    it('round-trips JSON values through namespaced keys', () => {
        const service = new StorageService(createMemoryBackend());

        expect(service.set('settings', { focusDuration: 1500 })).toBe(true);
        expect(service.get<{ focusDuration: number }>('settings')).toEqual({ focusDuration: 1500 });
    });

    it('returns null for a missing key', () => {
        const service = new StorageService(createMemoryBackend());

        expect(service.get('settings')).toBeNull();
    });

    it('falls back to null for corrupt JSON without throwing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const service = new StorageService(
            createMemoryBackend({ 'pomodoro-bird:settings': '{not json' }),
        );

        expect(service.get('settings')).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('reports a failed write without throwing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const throwingBackend: StorageBackend = {
            getItem: () => null,
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
            removeItem: () => {},
        };
        const service = new StorageService(throwingBackend);

        expect(service.set('settings', { focusDuration: 1500 })).toBe(false);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('reports failure when no backend is available', () => {
        // Mimic an unavailable window.localStorage (e.g. privacy mode).
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
            throw new Error('storage disabled');
        });
        const noBackend = new StorageService(undefined, 'test-prefix');

        expect(noBackend.get('settings')).toBeNull();
        expect(noBackend.set('settings', { a: 1 })).toBe(false);
        expect(noBackend.remove('settings')).toBe(false);
    });

    it('remove deletes the key', () => {
        const backend = createMemoryBackend({ 'pomodoro-bird:settings': '{}' });
        const service = new StorageService(backend);

        expect(service.remove('settings')).toBe(true);
        expect(service.get('settings')).toBeNull();
    });

    it('namespaces keys under the configured prefix', () => {
        const backend = createMemoryBackend();
        const service = new StorageService(backend, 'my-app');

        service.set('sessions', [1, 2, 3]);
        expect(backend.getItem('my-app:sessions')).toBe('[1,2,3]');
        expect(backend.getItem('pomodoro-bird:sessions')).toBeNull();
    });
});
