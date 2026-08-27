/**
 * Gift pool & rarity tables — Pomodoro Bird (Phase 4B).
 *
 * Configurable data, not inline logic (phase.md §4B Tasks): the exact gift
 * lists per rarity tier and the four duration-based rarity tables live here so
 * they can be tuned without touching the Reward Service. Odds are expressed in
 * whole percentage points and sum to 100 within each table.
 */

import type { RarityTier } from '../types/rewards';

/** A named gift in the pool. `key` doubles as the SVG asset name. */
export interface GiftDefinition {
    /** Stable id (used in GiftRecord.type and `/assets/gifts/<key>.svg`). */
    key: string;
    /** Calm, descriptive name (not currently shown in the UI). */
    name: string;
}

/** Odds for one rarity tier within a table (percentage, 0–100). */
export interface RarityTierChance {
    tier: RarityTier;
    chance: number;
}

/** Rarity odds that apply to focus sessions of at least `minDurationMinutes`. */
export interface RarityTable {
    minDurationMinutes: number;
    tiers: RarityTierChance[];
}

/** Canonical tier order — used for the cumulative roll and stable ordering. */
export const RARITY_TIERS: readonly RarityTier[] = [
    'common',
    'uncommon',
    'rare',
    'veryRare',
];

/** The exact gift pool per tier (phase.md §4B — Initial Gift Pool). */
export const GIFT_POOL: Record<RarityTier, readonly GiftDefinition[]> = {
    common: [
        { key: 'sunflower-seed', name: 'Sunflower Seed' },
        { key: 'wheat-bundle', name: 'Wheat Bundle' },
        { key: 'small-leaf', name: 'Small Leaf' },
        { key: 'feather', name: 'Feather' },
        { key: 'acorn', name: 'Acorn' },
    ],
    uncommon: [
        { key: 'small-flower', name: 'Small Flower' },
        { key: 'berry-cluster', name: 'Berry Cluster' },
        { key: 'small-twig', name: 'Small Twig' },
        { key: 'soft-nest-fiber', name: 'Soft Nest Fiber' },
    ],
    rare: [
        { key: 'decorative-nest-piece', name: 'Decorative Nest Piece' },
        { key: 'special-flower', name: 'Special Flower' },
        { key: 'polished-branch', name: 'Polished Branch' },
    ],
    veryRare: [
        { key: 'golden-feather', name: 'Golden Feather' },
        { key: 'rare-nest-ornament', name: 'Rare Nest Ornament' },
        { key: 'special-nest-decoration', name: 'Special Nest Decoration' },
    ],
};

/**
 * The four duration-based rarity tables (phase.md §4B — Initial Rarity Targets).
 * Ascending by `minDurationMinutes`; a session's table is the last one whose
 * threshold the session duration meets (longer focus → better odds).
 */
export const RARITY_TABLES: readonly RarityTable[] = [
    {
        minDurationMinutes: 15,
        tiers: [
            { tier: 'common', chance: 75 },
            { tier: 'uncommon', chance: 18 },
            { tier: 'rare', chance: 6 },
            { tier: 'veryRare', chance: 1 },
        ],
    },
    {
        minDurationMinutes: 25,
        tiers: [
            { tier: 'common', chance: 70 },
            { tier: 'uncommon', chance: 20 },
            { tier: 'rare', chance: 8 },
            { tier: 'veryRare', chance: 2 },
        ],
    },
    {
        minDurationMinutes: 50,
        tiers: [
            { tier: 'common', chance: 60 },
            { tier: 'uncommon', chance: 25 },
            { tier: 'rare', chance: 12 },
            { tier: 'veryRare', chance: 3 },
        ],
    },
    {
        minDurationMinutes: 90,
        tiers: [
            { tier: 'common', chance: 50 },
            { tier: 'uncommon', chance: 30 },
            { tier: 'rare', chance: 15 },
            { tier: 'veryRare', chance: 5 },
        ],
    },
];
