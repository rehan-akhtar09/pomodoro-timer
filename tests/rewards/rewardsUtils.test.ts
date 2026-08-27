import { describe, expect, it } from 'vitest';
import { GIFT_POOL, RARITY_TABLES, type RarityTable } from '../../src/data/giftPool';
import type { SessionCompletionEvent } from '../../src/hooks/usePomodoro';
import type { GiftRecord, RarityTier } from '../../src/types/rewards';
import {
    DUPLICATE_EVENT_WINDOW_MS,
    eventKeyForEvent,
    grantGift,
    isRewardRecord,
    MAX_VISIBLE_GIFTS,
    pickGift,
    rarityTableForMinutes,
    rollRarity,
    selectVisibleGifts,
    toValidRewards,
} from '../../src/utils/rewards';

/**
 * Deterministic seeded PRNG (mulberry32) so the rarity-distribution sample is
 * reproducible across runs while still exercising the full probability space.
 */
function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Count rolls per tier over a large sample using a seeded PRNG. */
function rollDistribution(
    seed: number,
    table: RarityTable,
    rolls: number,
): Record<RarityTier, number> {
    const random = mulberry32(seed);
    const counts: Record<RarityTier, number> = {
        common: 0,
        uncommon: 0,
        rare: 0,
        veryRare: 0,
    };
    for (let i = 0; i < rolls; i += 1) {
        const tier = rollRarity(random, table);
        counts[tier] += 1;
    }
    return counts;
}

function percentOf(counts: Record<RarityTier, number>, tier: RarityTier, rolls: number): number {
    return (counts[tier] / rolls) * 100;
}

function focusEvent(
    durationMs: number,
    completedFocusInCycle = 1,
): SessionCompletionEvent {
    return {
        mode: 'focus',
        completedFocusInCycle,
        nextMode: 'shortBreak',
        durationMs,
    };
}

describe('rarity tables — duration tier mapping', () => {
    it('maps 30 minutes to the 25-minute table (largest threshold met)', () => {
        const table = rarityTableForMinutes(30);
        expect(table.minDurationMinutes).toBe(25);
    });

    it('maps each configured threshold exactly to its own table', () => {
        expect(rarityTableForMinutes(15).minDurationMinutes).toBe(15);
        expect(rarityTableForMinutes(25).minDurationMinutes).toBe(25);
        expect(rarityTableForMinutes(50).minDurationMinutes).toBe(50);
        expect(rarityTableForMinutes(90).minDurationMinutes).toBe(90);
    });

    it('maps just-below thresholds to the previous table and beyond-90 to the 90+ table', () => {
        expect(rarityTableForMinutes(14).minDurationMinutes).toBe(15);
        expect(rarityTableForMinutes(24).minDurationMinutes).toBe(15);
        expect(rarityTableForMinutes(49).minDurationMinutes).toBe(25);
        expect(rarityTableForMinutes(89).minDurationMinutes).toBe(50);
        expect(rarityTableForMinutes(120).minDurationMinutes).toBe(90);
    });

    it('exposes the exact configured odds (summing to 100) per table', () => {
        expect(RARITY_TABLES.map((t) => t.tiers.map((c) => c.chance))).toEqual([
            [75, 18, 6, 1],
            [70, 20, 8, 2],
            [60, 25, 12, 3],
            [50, 30, 15, 5],
        ]);
    });
});

describe('rarity distribution — sample of 10,000 rolls', () => {
    it('roughly matches the 25-minute table odds (70/20/8/2)', () => {
        const table = rarityTableForMinutes(25);
        const rolls = 10_000;
        const counts = rollDistribution(0x4b2, table, rolls);

        expect(percentOf(counts, 'common', rolls)).toBeGreaterThan(67);
        expect(percentOf(counts, 'common', rolls)).toBeLessThan(73);
        expect(percentOf(counts, 'uncommon', rolls)).toBeGreaterThan(17);
        expect(percentOf(counts, 'uncommon', rolls)).toBeLessThan(23);
        expect(percentOf(counts, 'rare', rolls)).toBeGreaterThan(6);
        expect(percentOf(counts, 'rare', rolls)).toBeLessThan(10);
        expect(percentOf(counts, 'veryRare', rolls)).toBeGreaterThan(0.5);
        expect(percentOf(counts, 'veryRare', rolls)).toBeLessThan(3.5);
    });

    it('roughly matches the 15-minute table odds (75/18/6/1)', () => {
        const table = rarityTableForMinutes(15);
        const rolls = 10_000;
        const counts = rollDistribution(0x15, table, rolls);

        expect(percentOf(counts, 'common', rolls)).toBeGreaterThan(72);
        expect(percentOf(counts, 'common', rolls)).toBeLessThan(78);
        expect(percentOf(counts, 'uncommon', rolls)).toBeGreaterThan(15);
        expect(percentOf(counts, 'uncommon', rolls)).toBeLessThan(21);
        expect(percentOf(counts, 'rare', rolls)).toBeGreaterThan(4);
        expect(percentOf(counts, 'rare', rolls)).toBeLessThan(8);
        expect(percentOf(counts, 'veryRare', rolls)).toBeGreaterThan(0.1);
        expect(percentOf(counts, 'veryRare', rolls)).toBeLessThan(2);
    });
});

describe('gift selection', () => {
    it('picks only gifts from the requested rarity pool', () => {
        const random = mulberry32(7);
        const seen = new Set<string>();
        for (let i = 0; i < 500; i += 1) {
            const gift = pickGift('uncommon', random);
            expect(GIFT_POOL.uncommon.some((g) => g.key === gift.key)).toBe(true);
            seen.add(gift.key);
        }
        // A uniform pick over 4 options reaches all of them.
        expect(seen.size).toBe(4);
    });

    it('never picks outside the pool for any rarity', () => {
        const random = mulberry32(11);
        const tiers: RarityTier[] = ['common', 'uncommon', 'rare', 'veryRare'];
        for (const tier of tiers) {
            for (let i = 0; i < 200; i += 1) {
                const gift = pickGift(tier, random);
                expect(GIFT_POOL[tier].some((g) => g.key === gift.key)).toBe(true);
            }
        }
    });
});

describe('selectVisibleGifts — display cap keeps the full collection', () => {
    function gift(id: string, earnedAt: number): GiftRecord {
        return {
            id,
            sessionId: `focus:1500000:1:shortBreak:${earnedAt}`,
            type: 'feather',
            rarity: 'common',
            earnedAt,
        };
    }

    it('shows everything when the collection is at or below the cap', () => {
        const rewards = [gift('a', 1), gift('b', 2), gift('c', 3)];
        expect(selectVisibleGifts(rewards)).toBe(rewards);
    });

    it('shows only the newest cap items, newest last, without mutating the input', () => {
        const rewards: GiftRecord[] = [];
        for (let i = 0; i < MAX_VISIBLE_GIFTS + 5; i += 1) {
            rewards.push(gift(`g${i}`, i + 1));
        }
        const before = [...rewards];

        const visible = selectVisibleGifts(rewards);

        expect(visible).toHaveLength(MAX_VISIBLE_GIFTS);
        expect(visible[visible.length - 1].earnedAt).toBe(rewards[rewards.length - 1].earnedAt);
        expect(visible[0].earnedAt).toBe(rewards[5].earnedAt);
        expect(rewards).toEqual(before); // the full collection is untouched
    });

    it('keeps the full collection persisted regardless of the display cap', () => {
        const rewards: GiftRecord[] = [];
        for (let i = 0; i < MAX_VISIBLE_GIFTS + 20; i += 1) {
            rewards.push(gift(`g${i}`, i + 1));
        }

        selectVisibleGifts(rewards);

        expect(rewards).toHaveLength(MAX_VISIBLE_GIFTS + 20);
    });
});

describe('reward record validation', () => {
    it('accepts a well-formed gift record', () => {
        const record: GiftRecord = {
            id: 'uuid-1',
            sessionId: 'focus:1500000:1:shortBreak:1000',
            type: 'golden-feather',
            rarity: 'veryRare',
            earnedAt: 1000,
        };
        expect(isRewardRecord(record)).toBe(true);
        expect(toValidRewards([record])).toEqual([record]);
    });

    it('drops malformed records and keeps the valid ones', () => {
        const valid: GiftRecord = {
            id: 'uuid-valid',
            sessionId: 'focus:1500000:1:shortBreak:2000',
            type: 'feather',
            rarity: 'common',
            earnedAt: 2000,
        };
        const malformed = [
            { ...valid, id: '' },
            { ...valid, rarity: 'legendary' },
            { ...valid, earnedAt: Number.NaN },
            { ...valid, type: 42 },
            'not-an-object',
            null,
        ];
        expect(toValidRewards([valid, ...malformed])).toEqual([valid]);
    });

    it('returns an empty collection for non-array persisted data', () => {
        expect(toValidRewards(null)).toEqual([]);
        expect(toValidRewards({})).toEqual([]);
        expect(toValidRewards('garbage')).toEqual([]);
    });
});

describe('grantGift — session identity and dedupe key', () => {
    it('derives the session id from the event fields plus the earned timestamp', () => {
        const event = focusEvent(25 * 60_000, 3);
        const result = grantGift([], event, { now: 123_456, random: () => 0 });

        expect(result.granted?.sessionId).toBe(
            `${eventKeyForEvent(event)}:${123_456}`,
        );
        expect(result.granted?.earnedAt).toBe(123_456);
    });

    it('blocks a duplicate delivery within the duplicate window', () => {
        const event = focusEvent(25 * 60_000);
        const first = grantGift([], event, { now: 1_000, random: () => 0 });
        const second = grantGift(first.rewards, event, {
            now: 1_000 + DUPLICATE_EVENT_WINDOW_MS - 1,
            random: () => 0,
        });

        expect(second.granted).toBeNull();
        expect(second.rewards).toHaveLength(1);
    });

    it('allows the identical event fields once the window has passed', () => {
        const event = focusEvent(25 * 60_000);
        const first = grantGift([], event, { now: 1_000, random: () => 0 });
        const later = grantGift(first.rewards, event, {
            now: 1_000 + DUPLICATE_EVENT_WINDOW_MS + 1,
            random: () => 0,
        });

        expect(later.granted).not.toBeNull();
        expect(later.rewards).toHaveLength(2);
        expect(new Set(later.rewards.map((r) => r.sessionId))).toHaveLength(2);
    });
});
