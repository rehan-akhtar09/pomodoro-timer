/**
 * Reward System types — Pomodoro Bird (Phase 4B).
 *
 * A gift is granted for every naturally completed focus session (phase.md §4B
 * Reward Rules). Records are intentionally flat and JSON-serializable, mirroring
 * the future Firestore shape (`rewards/{rewardId}`) like the Phase 4 session
 * records (architecture.md §5). Each reward references its originating session
 * through `sessionId` so the service can enforce "never more than one reward per
 * session" (rules.md §6).
 */

/** The four rarity tiers of the gift pool (phase.md §4B). */
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'veryRare';

/** One gift granted for a completed focus session. */
export interface GiftRecord {
    /** Stable unique id of this reward. */
    id: string;
    /**
     * References the completed focus session that granted it. Derived from the
     * completion event fields + the grant timestamp so the same event delivery
     * can never be rewarded twice (Phase 4B idempotency guard).
     */
    sessionId: string;
    /** Stable gift key from the gift pool data (also the asset name, e.g. `acorn`). */
    type: string;
    /** Rarity tier this gift was drawn from (phase.md §4B rarity tables). */
    rarity: RarityTier;
    /** Epoch ms when the gift was earned. */
    earnedAt: number;
}
