/**
 * Storage Service — Pomodoro Bird (Phase 4).
 *
 * A small, framework-independent abstraction over browser persistence
 * (architecture.md §3). Components never touch localStorage keys directly —
 * they read/write through this service or through hooks built on it.
 *
 * Defensive by design (rules.md §4 — storage errors / invalid settings):
 * - Missing or corrupt JSON never throws: `get` falls back to `null` and logs
 *   a warning during development.
 * - `set`/`remove` swallow backend failures (quota exceeded, private mode,
 *   disabled storage) and report success/failure so callers can inform the
 *   user while the timer keeps running in memory.
 *
 * Keys are namespaced under one app prefix so unrelated data on the same
 * origin cannot collide. Values are flat JSON (plain objects/arrays) that
 * mirror the future Firestore shape (architecture.md §5).
 */

/** Minimal browser-storage interface the service depends on (injectable for tests). */
export interface StorageBackend {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** Canonical key names (namespaced under the app prefix). */
export const STORAGE_KEYS = {
    settings: 'settings',
    sessions: 'sessions',
    rewards: 'rewards',
    audioPreferences: 'audioPreferences',
} as const;

const STORAGE_PREFIX = 'pomodoro-bird';

/** Resolve the browser storage backend, tolerating environments where it throws. */
function defaultBackend(): StorageBackend | null {
    try {
        return window.localStorage;
    } catch {
        // Storage unavailable (e.g. some privacy modes / SSR). The service then
        // reports every read as missing and every write as failed — gracefully.
        return null;
    }
}

export class StorageService {
    private readonly backend: StorageBackend | null;
    private readonly prefix: string;

    constructor(backend?: StorageBackend, prefix: string = STORAGE_PREFIX) {
        this.backend = backend ?? defaultBackend();
        this.prefix = prefix;
    }

    /** Read and deserialize `key`; returns `null` when missing or corrupt. */
    get<T>(key: string): T | null {
        if (!this.backend) {
            return null;
        }
        try {
            const raw = this.backend.getItem(this.keyName(key));
            if (raw === null) {
                return null;
            }
            return JSON.parse(raw) as T;
        } catch (error) {
            console.warn(`[storage] could not read "${key}"; using fallback.`, error);
            return null;
        }
    }

    /** Serialize and write `value`; returns true on success, false on failure. */
    set<T>(key: string, value: T): boolean {
        if (!this.backend) {
            return false;
        }
        try {
            this.backend.setItem(this.keyName(key), JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`[storage] could not write "${key}"; changes may not persist.`, error);
            return false;
        }
    }

    /** Remove `key`; returns true on success, false on failure. */
    remove(key: string): boolean {
        if (!this.backend) {
            return false;
        }
        try {
            this.backend.removeItem(this.keyName(key));
            return true;
        } catch (error) {
            console.warn(`[storage] could not remove "${key}".`, error);
            return false;
        }
    }

    private keyName(name: string): string {
        return `${this.prefix}:${name}`;
    }
}

/** Shared instance used by the app; tests may construct their own instance. */
export const storageService = new StorageService();
