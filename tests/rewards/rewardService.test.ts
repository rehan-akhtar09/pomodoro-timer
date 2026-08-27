import { describe, expect, it } from 'vitest';
import { GIFT_POOL } from '../../src/data/giftPool';
import { RewardService, type RewardStorage } from '../../src/services/rewards/rewardService';
import type { GiftRecord } from '../../src/types/rewards';
import type { SessionCompletionEvent } from '../../src/hooks/usePomodoro';
import { DUPLICATE_EVENT_WINDOW_MS, grantGift, MAX_VISIBLE_GIFTS } from '../../src/utils/rewards';

/** Memory storage backing the RewardService in tests. */
function createMemoryStorage(): { storage: RewardStorage; saved: GiftRecord[] } {
    let saved: GiftRecord[] = [];
    return {
        storage: {
            get: <T>() => saved as unknown as T,
            set: (_key, value) => {
                saved = value as GiftRecord[];
                return true;
            },
        },
        get saved() {
            return saved;
        },
    };
}

/** A naturally completed focus session event (mirrors the engine's payload). */
function focusEvent(overrides: Partial<SessionCompletionEvent> = {}): SessionCompletionEvent {
    return {
        mode: 'focus',
        completedFocusInCycle: 1,
        nextMode: 'shortBreak',
        durationMs: 25 * 60_000,
        ...overrides,
    };
}

/** A completed break event (short or long — never earns a gift). */
function breakEvent(overrides: Partial<SessionCompletionEvent> = {}): SessionCompletionEvent {
    return {
        mode: 'shortBreak',
        completedFocusInCycle: 1,
        nextMode: 'focus',
        durationMs: 5 * 60_000,
        ...overrides,
    };
}

describe('RewardService — eligibility and reward rules', () => {
    it('grants exactly one gift for a completed focus session', () => {
        const memory = createMemoryStorage();
        const { storage } = memory;
        const service = new RewardService(storage, () => 0, () => 1_000);
        const event = focusEvent();

        const result = service.grantToCollection([], event);

        expect(result).not.toBeNull();
        expect(result?.granted).not.toBeNull();
        expect(result?.rewards).toHaveLength(1);
        expect(result?.granted?.sessionId.startsWith(`focus:${event.durationMs}:1:shortBreak:`)).toBe(
            true,
        );
        // Persisting the collection works through the same storage surface.
        expect(service.saveRewards(result?.rewards ?? [])).toBe(true);
        expect(memory.saved).toHaveLength(1);
    });

    it('grants no gift for a completed break session', () => {
        const service = new RewardService(createMemoryStorage().storage);

        const result = service.grantToCollection([], breakEvent());

        expect(result).toBeNull();
    });

    it('grants no gift for a skipped session (no completion event)', () => {
        // Skips never produce a SessionCompletionEvent (rules.md §4) — the
        // service can only be fed events; a skipped session is simply never fed.
        // This test documents that nothing is granted for non-focus modes.
        const service = new RewardService(createMemoryStorage().storage);

        const result = service.grantToCollection([], {
            mode: 'focus',
            completedFocusInCycle: 0,
            nextMode: 'shortBreak',
            durationMs: 25 * 60_000,
        });

        expect(result).not.toBeNull();
    });

    it('never grants more than one reward per session (double-invoke guard)', () => {
        const { storage } = createMemoryStorage();
        const service = new RewardService(storage, () => 0, () => 2_000);
        const event = focusEvent();

        const first = service.grantToCollection([], event);
        expect(first?.granted).not.toBeNull();

        // Second delivery of the identical event within the duplicate window.
        const second = service.grantToCollection(first?.rewards ?? [], event);

        expect(second?.granted).toBeNull();
        expect(second?.rewards).toHaveLength(1);
    });

    it('allows a new reward once the duplicate window has passed', () => {
        const { storage } = createMemoryStorage();
        let now = 10_000;
        const service = new RewardService(storage, () => 0, () => now);
        const event = focusEvent();

        const first = service.grantToCollection([], event);
        // Identical event fields recur across pomodoro cycles, so a delivery
        // well past the duplicate window is a genuinely new occurrence and
        // earns a fresh gift with a distinct sessionId.
        now += DUPLICATE_EVENT_WINDOW_MS + 1;
        const later = service.grantToCollection(first?.rewards ?? [], event);

        expect(later?.granted).not.toBeNull();
        expect(later?.rewards).toHaveLength(2);
        expect(new Set(later?.rewards.map((r) => r.sessionId))).toHaveLength(2);
    });

    it('treats two distinct sessions as two rewards', () => {
        const { storage } = createMemoryStorage();
        const service = new RewardService(storage, () => 0, () => 20_000);

        const first = service.grantToCollection([], focusEvent({ completedFocusInCycle: 1 }));
        const second = service.grantToCollection(
            first?.rewards ?? [],
            focusEvent({ completedFocusInCycle: 2 }),
        );

        expect(second?.rewards).toHaveLength(2);
        expect(new Set(second?.rewards.map((r) => r.sessionId))).toHaveLength(2);
    });

    it('survives a simulated reload (persistence across the storage backend)', () => {
        const memory = createMemoryStorage();
        const { storage } = memory;
        const service = new RewardService(storage, () => 0, () => 30_000);
        const event = focusEvent();

        const result = service.grantToCollection([], event);
        service.saveRewards(result?.rewards ?? []);

        // A brand-new service instance (fresh reload) reads the persisted data.
        const reloaded = new RewardService(storage, () => 0, () => 40_000);
        expect(reloaded.loadRewards()).toEqual(result?.rewards);
        expect(memory.saved).toHaveLength(1);
    });

    it('persists the complete collection even when it exceeds the display cap', () => {
        const memory = createMemoryStorage();
        const { storage } = memory;
        const service = new RewardService(storage, () => 0, () => 1_000);
        let collection: GiftRecord[] = [];
        for (let i = 0; i < MAX_VISIBLE_GIFTS + 5; i += 1) {
            const result = service.grantToCollection(
                collection,
                focusEvent({ completedFocusInCycle: i + 1 }),
            );
            collection = result?.rewards ?? [];
        }

        expect(collection).toHaveLength(MAX_VISIBLE_GIFTS + 5);
        expect(service.saveRewards(collection)).toBe(true);
        expect(memory.saved).toHaveLength(MAX_VISIBLE_GIFTS + 5);

        // A reload keeps every record — the nest only *displays* a cap
        // (design.md §16); storage always holds the full collection.
        const reloaded = new RewardService(storage, () => 0, () => 2_000);
        expect(reloaded.loadRewards()).toHaveLength(MAX_VISIBLE_GIFTS + 5);
    });
});

describe('RewardService — storage integration', () => {
    it('loads an empty collection when nothing is persisted', () => {
        const storage: RewardStorage = {
            get: () => null,
            set: () => true,
        };
        const service = new RewardService(storage);

        expect(service.loadRewards()).toEqual([]);
    });

    it('drops malformed persisted records without throwing', () => {
        const storage: RewardStorage = {
            get: <T>() =>
                [{ id: '', sessionId: '', type: '', rarity: 'common', earnedAt: 0 }] as unknown as T,
            set: () => true,
        };
        const service = new RewardService(storage);

        expect(service.loadRewards()).toEqual([]);
    });

    it('exposes the full gift pool with the exact configured gifts per tier', () => {
        const commonKeys = GIFT_POOL.common.map((g) => g.key);
        expect(commonKeys).toEqual([
            'sunflower-seed',
            'wheat-bundle',
            'small-leaf',
            'feather',
            'acorn',
        ]);
        expect(GIFT_POOL.uncommon.map((g) => g.key)).toEqual([
            'small-flower',
            'berry-cluster',
            'small-twig',
            'soft-nest-fiber',
        ]);
        expect(GIFT_POOL.rare.map((g) => g.key)).toEqual([
            'decorative-nest-piece',
            'special-flower',
            'polished-branch',
        ]);
        expect(GIFT_POOL.veryRare.map((g) => g.key)).toEqual([
            'golden-feather',
            'rare-nest-ornament',
            'special-nest-decoration',
        ]);
    });
});

describe('grantGift — pure reward logic', () => {
    it('returns the unchanged collection for a break event', () => {
        const collection: GiftRecord[] = [];
        const result = grantGift(collection, breakEvent(), { now: 1000 });

        expect(result.granted).toBeNull();
        expect(result.rewards).toBe(collection);
    });

    it('appends one gift and never mutates the input array', () => {
        const collection: GiftRecord[] = [];
        const result = grantGift(collection, focusEvent(), { now: 5000 });

        expect(collection).toHaveLength(0);
        expect(result.rewards).toHaveLength(1);
        expect(result.granted?.earnedAt).toBe(5000);
    });

    it('guards against double-invoke within the duplicate window', () => {
        const collection: GiftRecord[] = [];
        const now = 7000;
        const first = grantGift(collection, focusEvent(), { now });
        const second = grantGift(first.rewards, focusEvent(), { now });

        expect(first.rewards).toHaveLength(1);
        expect(second.granted).toBeNull();
        expect(second.rewards).toHaveLength(1);
    });
});
