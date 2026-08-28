import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onlyInLocal, planSyncMerge, resolveSettingsConflict, unionById } from '../../src/services/sync/syncMerge';
import type { CloudData, LocalData } from '../../src/services/sync/syncMerge';
import type { GiftRecord } from '../../src/types/rewards';
import type { SessionRecord } from '../../src/types/stats';
import { DEFAULT_TIMER_SETTINGS } from '../../src/types/timer';
import type { SessionMode, TimerSettings } from '../../src/types/timer';

function settings(overrides: Partial<TimerSettings> = {}): TimerSettings {
    return { ...DEFAULT_TIMER_SETTINGS, ...overrides };
}

function record(id: string, mode: SessionMode = 'focus', completedAt = 1000): SessionRecord {
    return { id, mode, durationMs: 25 * 60 * 1000, completedAt };
}

function gift(id: string, sessionId = id, earnedAt = 2000): GiftRecord {
    return { id, sessionId, type: 'feather', rarity: 'common', earnedAt };
}

function localData(overrides: Partial<LocalData> = {}): LocalData {
    return { settings: settings(), sessions: [], rewards: [], ...overrides };
}

function cloudData(overrides: Partial<CloudData> = {}): CloudData {
    return { settings: null, sessions: [], rewards: [], ...overrides };
}

beforeEach(() => {
    // toValidSettings logs a warning for null/invalid settings; that is expected here.
    vi.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('unionById', () => {
    it('merges both collections keeping local-first insertion order', () => {
        const merged = unionById([record('a'), record('b')], [record('c')]);
        expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    });

    it('dedupes by id, keeping the local copy', () => {
        const merged = unionById([record('a'), record('b')], [record('b', 'shortBreak'), record('c')]);
        expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(merged[1].mode).toBe('focus');
    });

    it('handles empty collections on either side', () => {
        expect(unionById([], [record('a')]).map((item) => item.id)).toEqual(['a']);
        expect(unionById([record('a')], []).map((item) => item.id)).toEqual(['a']);
        expect(unionById([], [])).toEqual([]);
    });
});

describe('onlyInLocal', () => {
    it('returns items present locally but not in the cloud', () => {
        expect(onlyInLocal([record('a'), record('b')], [record('b')]).map((item) => item.id)).toEqual(['a']);
    });

    it('returns everything when the cloud is empty', () => {
        expect(onlyInLocal([record('a')], []).map((item) => item.id)).toEqual(['a']);
    });

    it('returns nothing when the cloud already has every item', () => {
        expect(onlyInLocal([record('a')], [record('a')])).toEqual([]);
    });
});

describe('resolveSettingsConflict', () => {
    it('lets the cloud win when cloud settings exist', () => {
        const result = resolveSettingsConflict(settings({ focusDuration: 10 }), settings({ focusDuration: 50 }));
        expect(result).toEqual({
            settings: settings({ focusDuration: 50 }),
            uploadSettings: false,
            applyCloudSettings: true,
        });
    });

    it('uploads local settings when only local exists (first sign-in on this device)', () => {
        const result = resolveSettingsConflict(settings({ focusDuration: 10 }), null);
        expect(result).toEqual({
            settings: settings({ focusDuration: 10 }),
            uploadSettings: true,
            applyCloudSettings: false,
        });
    });

    it('falls back to defaults when neither side has settings', () => {
        const result = resolveSettingsConflict(null, null);
        expect(result).toEqual({
            settings: DEFAULT_TIMER_SETTINGS,
            uploadSettings: false,
            applyCloudSettings: false,
        });
    });

    it('sanitizes invalid cloud settings instead of trusting them', () => {
        const result = resolveSettingsConflict(settings(), { ...settings(), focusDuration: -5 });
        expect(result.settings).toEqual(DEFAULT_TIMER_SETTINGS);
        expect(result.uploadSettings).toBe(false);
        expect(result.applyCloudSettings).toBe(true);
    });
});

describe('planSyncMerge', () => {
    it('unions sessions and rewards, uploading only local-only items', () => {
        const plan = planSyncMerge(
            localData({
                sessions: [record('a'), record('b')],
                rewards: [gift('g1', 'a'), gift('g2', 'b')],
            }),
            cloudData({
                sessions: [record('b'), record('c')],
                rewards: [gift('g2', 'b'), gift('g3', 'c')],
            }),
        );
        expect(plan.sessions.map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(plan.rewards.map((item) => item.id)).toEqual(['g1', 'g2', 'g3']);
        expect(plan.uploadSessions.map((item) => item.id)).toEqual(['a']);
        expect(plan.uploadRewards.map((item) => item.id)).toEqual(['g1']);
    });

    it('applies cloud settings when the cloud has them', () => {
        const plan = planSyncMerge(
            localData({ settings: settings({ focusDuration: 10 }) }),
            cloudData({ settings: settings({ focusDuration: 50 }) }),
        );
        expect(plan.settings).toEqual(settings({ focusDuration: 50 }));
        expect(plan.applyCloudSettings).toBe(true);
        expect(plan.uploadSettings).toBe(false);
    });

    it('keeps and uploads local settings when the cloud has none', () => {
        const plan = planSyncMerge(localData({ settings: settings({ focusDuration: 10 }) }), cloudData());
        expect(plan.settings).toEqual(settings({ focusDuration: 10 }));
        expect(plan.uploadSettings).toBe(true);
        expect(plan.applyCloudSettings).toBe(false);
    });

    it('falls back to defaults when neither side has settings', () => {
        const plan = planSyncMerge(localData({ settings: null }), cloudData());
        expect(plan.settings).toEqual(DEFAULT_TIMER_SETTINGS);
        expect(plan.uploadSettings).toBe(false);
        expect(plan.applyCloudSettings).toBe(false);
    });

    it('dedupes identical records across sides', () => {
        const plan = planSyncMerge(localData({ sessions: [record('a')] }), cloudData({ sessions: [record('a')] }));
        expect(plan.sessions).toHaveLength(1);
        expect(plan.uploadSessions).toEqual([]);
    });
});
