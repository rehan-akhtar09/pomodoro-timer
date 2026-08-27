/**
 * Reward Service — Pomodoro Bird (Phase 4B).
 *
 * Tracks gifts earned from naturally completed FOCUS sessions and persists them
 * through the same Storage Service as settings/sessions (architecture.md §3).
 * Contains no timer logic and never touches TimerState; it only consumes the
 * existing `onSessionComplete` extension point from `usePomodoro` — no second
 * completion-detection mechanism (rules.md §6).
 *
 * The service owns the reward rules (eligibility, rarity roll, gift selection,
 * duplicate guard) and storage I/O; the `useRewards` hook binds it to React.
 */

import { STORAGE_KEYS, storageService } from '../storage/storageService';
import type { SessionCompletionEvent } from '../../hooks/usePomodoro';
import type { GiftRecord } from '../../types/rewards';
import { grantGift, toValidRewards, type GrantResult } from '../../utils/rewards';

/** Minimal storage surface the service depends on (injectable for tests). */
export interface RewardStorage {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): boolean;
}

export class RewardService {
    private readonly storage: RewardStorage;
    private readonly random: () => number;
    private readonly now: () => number;

    constructor(
        storage: RewardStorage = storageService,
        random: () => number = Math.random,
        now: () => number = Date.now,
    ) {
        this.storage = storage;
        this.random = random;
        this.now = now;
    }

    /** Read the full persisted gift collection (defensive; never throws). */
    loadRewards(): GiftRecord[] {
        return toValidRewards(this.storage.get(STORAGE_KEYS.rewards));
    }

    /** Persist the gift collection; returns false on storage failure. */
    saveRewards(rewards: GiftRecord[]): boolean {
        return this.storage.set(STORAGE_KEYS.rewards, rewards);
    }

    /** Whether a completion event earns a gift (only focus sessions do). */
    isEligible(event: SessionCompletionEvent): boolean {
        return event.mode === 'focus';
    }

    /**
     * Apply the reward rules to a completion event against the current
     * collection (pure — no storage I/O). Returns null when the event earns
     * nothing (break completion, skipped session), or a GrantResult whose
     * `granted` is null for a duplicate delivery.
     */
    grantToCollection(rewards: GiftRecord[], event: SessionCompletionEvent): GrantResult | null {
        if (!this.isEligible(event)) {
            return null;
        }
        return grantGift(rewards, event, { random: this.random, now: this.now() });
    }
}

/** Shared instance used by the app; tests may construct their own instance. */
export const rewardService = new RewardService();
