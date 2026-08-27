/**
 * Reward logic — Pomodoro Bird (Phase 4B).
 *
 * Pure, framework-independent functions implementing the Reward Rules
 * (rules.md §6 / phase.md §4B):
 * - Exactly one gift per naturally completed FOCUS session.
 * - No gift for break completion, skipped sessions, or cancel.
 * - Never more than one reward per session — the `sessionId` uniqueness guard
 *   protects against StrictMode double-invoke / re-render / double-event.
 * - The full collection persists; only a capped window is *displayed* by the
 *   nest (design.md §16: no more than 12 visible gift items at once).
 */

import { GIFT_POOL, RARITY_TABLES, type GiftDefinition, type RarityTable } from '../data/giftPool';
import type { SessionCompletionEvent } from '../hooks/usePomodoro';
import type { GiftRecord, RarityTier } from '../types/rewards';

/** How many gifts the nest may display at once (design.md §16). */
export const MAX_VISIBLE_GIFTS = 12;

/**
 * Time window (ms) within which a second delivery of the same completion event
 * is treated as a duplicate. A genuine re-occurrence of identical event fields
 * (same mode/cycle position/next mode/duration) only happens after a full
 * pomodoro cycle — minutes later — so this short window never swallows a real
 * gift while still catching StrictMode double-invoke / re-render / double-event.
 */
export const DUPLICATE_EVENT_WINDOW_MS = 5000;

/** Build the stable event key identifying one completion event (for dedupe). */
export function eventKeyForEvent(event: SessionCompletionEvent): string {
    return `${event.mode}:${event.durationMs}:${event.completedFocusInCycle}:${event.nextMode}`;
}

/**
 * Rarity table for a focus session of `minutes` (phase.md §4B).
 *
 * Assumption (flagged for approval): for durations between the configured
 * thresholds, the session uses the largest table whose minimum it meets —
 * longer sessions get better odds, so e.g. a 30-minute session uses the
 * 25-minute table.
 */
export function rarityTableForMinutes(
    minutes: number,
    tables: readonly RarityTable[] = RARITY_TABLES,
): RarityTable {
    let selected = tables[0];
    for (const table of tables) {
        if (minutes >= table.minDurationMinutes) {
            selected = table;
        }
    }
    return selected;
}

/**
 * Roll a rarity tier using a cumulative probability walk over the table's
 * odds (in `RARITY_TIERS` order). `random` returns a value in [0, 1).
 */
export function rollRarity(random: () => number, table: RarityTable): RarityTier {
    const roll = random() * 100;
    let cumulative = 0;
    for (const { tier, chance } of table.tiers) {
        cumulative += chance;
        if (roll < cumulative) {
            return tier;
        }
    }
    // Floating-point safety: a roll at/over the final cumulative sum (100)
    // lands on the last tier.
    return table.tiers[table.tiers.length - 1].tier;
}

/** Pick one gift uniformly from the pool of the given rarity. */
export function pickGift(rarity: RarityTier, random: () => number): GiftDefinition {
    const pool = GIFT_POOL[rarity];
    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
    return pool[index];
}

/**
 * Whether the collection already holds a reward for the same completion event
 * delivered within the duplicate window (Phase 4B idempotency guard).
 */
export function isDuplicateReward(
    rewards: GiftRecord[],
    event: SessionCompletionEvent,
    now: number,
): boolean {
    const key = eventKeyForEvent(event);
    return rewards.some(
        (reward) =>
            reward.sessionId.startsWith(`${key}:`) &&
            now - reward.earnedAt < DUPLICATE_EVENT_WINDOW_MS,
    );
}

/** Stable unique id for a reward (crypto.randomUUID with a fallback). */
function createRewardId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface GrantResult {
    /** The full collection, with the new gift appended when one was granted. */
    rewards: GiftRecord[];
    /** The newly granted gift, or null when the event earned nothing. */
    granted: GiftRecord | null;
}

/**
 * Apply the reward rules to one completion event against a collection.
 * Returns `{ rewards, granted }` where `granted` is null when the event is not
 * a naturally completed focus session or is a duplicate delivery. Never
 * mutates the input collection.
 */
export function grantGift(
    rewards: GiftRecord[],
    event: SessionCompletionEvent,
    options: { random?: () => number; now?: number } = {},
): GrantResult {
    const random = options.random ?? Math.random;
    const now = options.now ?? Date.now();

    // Rule: only naturally completed FOCUS sessions earn a gift (rules.md §6);
    // breaks and any stray non-focus event are ignored here.
    if (event.mode !== 'focus') {
        return { rewards, granted: null };
    }

    // Idempotency guard: one reward per session even if the same event is
    // delivered twice (StrictMode double-invoke / re-render / double-event).
    if (isDuplicateReward(rewards, event, now)) {
        return { rewards, granted: null };
    }

    const table = rarityTableForMinutes(event.durationMs / 60_000);
    const rarity = rollRarity(random, table);
    const gift = pickGift(rarity, random);
    const earnedAt = now;

    const granted: GiftRecord = {
        id: createRewardId(),
        sessionId: `${eventKeyForEvent(event)}:${earnedAt}`,
        type: gift.key,
        rarity,
        earnedAt,
    };

    return { rewards: [...rewards, granted], granted };
}

/** Whether unknown persisted data is a single well-formed gift record. */
export function isRewardRecord(value: unknown): value is GiftRecord {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const record = value as Partial<GiftRecord>;
    return (
        typeof record.id === 'string' &&
        record.id.length > 0 &&
        typeof record.sessionId === 'string' &&
        record.sessionId.length > 0 &&
        typeof record.type === 'string' &&
        record.type.length > 0 &&
        (record.rarity === 'common' ||
            record.rarity === 'uncommon' ||
            record.rarity === 'rare' ||
            record.rarity === 'veryRare') &&
        typeof record.earnedAt === 'number' &&
        Number.isFinite(record.earnedAt)
    );
}

/** Coerce unknown persisted data into a gift array, dropping bad records. */
export function toValidRewards(value: unknown): GiftRecord[] {
    if (!Array.isArray(value)) {
        if (value !== undefined && value !== null) {
            console.warn('[rewards] ignoring invalid persisted rewards.', value);
        }
        return [];
    }
    const valid = value.filter(isRewardRecord);
    if (valid.length !== value.length) {
        console.warn('[rewards] dropped malformed reward records.', {
            total: value.length,
            kept: valid.length,
        });
    }
    return valid;
}

/**
 * The gifts the nest displays: the most recent `cap` records (newest last).
 * The complete collection is never pruned — only what is shown is capped
 * (design.md §16) — so every record stays persisted regardless of display.
 */
export function selectVisibleGifts(
    rewards: GiftRecord[],
    cap: number = MAX_VISIBLE_GIFTS,
): GiftRecord[] {
    return rewards.length <= cap ? rewards : rewards.slice(rewards.length - cap);
}
