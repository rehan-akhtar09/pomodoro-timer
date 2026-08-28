/**
 * Sync merge logic — Pomodoro Bird (Accounts & Cloud Sync phase).
 *
 * Pure, framework-independent functions that decide how local (localStorage)
 * and cloud (Firestore) data combine on sign-in. Kept free of Firebase imports
 * so the exact merge/conflict rules are unit-testable (rules.md §6).
 *
 * Sync strategy (flagged for approval — genuinely ambiguous product decision):
 *  1. Merge existing local data INTO the cloud record rather than discarding
 *     either side.
 *  2. Sessions and rewards are immutable facts → UNION by id (dedupe).
 *  3. Settings are a single value, not a list → explicit conflict rule (below).
 */

import type { GiftRecord } from '../../types/rewards';
import type { SessionRecord } from '../../types/stats';
import type { TimerSettings } from '../../types/timer';
import { toValidRewards } from '../../utils/rewards';
import { toValidSessions } from '../../utils/sessionStats';
import { toValidSettings } from '../../utils/validation';

/** Everything read from localStorage at sync time. */
export interface LocalData {
    settings: TimerSettings | null;
    sessions: SessionRecord[];
    rewards: GiftRecord[];
}

/** Everything read from Firestore at sync time. */
export interface CloudData {
    settings: TimerSettings | null;
    sessions: SessionRecord[];
    rewards: GiftRecord[];
}

/** The merged outcome plus exactly what still needs to be uploaded. */
export interface SyncPlan {
    /** Final settings after conflict resolution (the single value to use). */
    settings: TimerSettings;
    /** Union of local + cloud sessions (deduped, sorted by completedAt). */
    sessions: SessionRecord[];
    /** Union of local + cloud rewards (deduped, sorted by earnedAt). */
    rewards: GiftRecord[];
    /** Sessions present only locally → upload these to Firestore. */
    uploadSessions: SessionRecord[];
    /** Rewards present only locally → upload these to Firestore. */
    uploadRewards: GiftRecord[];
    /** True when local settings must be uploaded to the cloud. */
    uploadSettings: boolean;
    /** True when cloud settings must be applied to local storage. */
    applyCloudSettings: boolean;
}

/** Union two collections by `id`, keeping insertion order and deduping. */
export function unionById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
    const seen = new Set<string>();
    const merged: T[] = [];
    for (const item of [...local, ...cloud]) {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
        }
    }
    return merged;
}

/** Sessions present locally but not in the cloud (what to upload). */
export function onlyInLocal<T extends { id: string }>(local: T[], cloud: T[]): T[] {
    const cloudIds = new Set(cloud.map((item) => item.id));
    return local.filter((item) => !cloudIds.has(item.id));
}

/**
 * Resolve the settings conflict.
 *
 * Rule (flagged for approval): when the cloud already has settings, the cloud
 * wins — a returning user logging in on a new device expects their saved
 * account settings. When only local settings exist (first sign-in from this
 * device), the local value is used and uploaded, so a user's customizations
 * are never discarded.
 */
export function resolveSettingsConflict(
    local: TimerSettings | null,
    cloud: TimerSettings | null,
): { settings: TimerSettings; uploadSettings: boolean; applyCloudSettings: boolean } {
    if (cloud !== null) {
        return {
            settings: toValidSettings(cloud),
            uploadSettings: false,
            applyCloudSettings: true,
        };
    }
    if (local !== null) {
        return {
            settings: toValidSettings(local),
            uploadSettings: true,
            applyCloudSettings: false,
        };
    }
    return {
        settings: toValidSettings(null),
        uploadSettings: false,
        applyCloudSettings: false,
    };
}

/** Build the full sync plan from the two snapshots. */
export function planSyncMerge(local: LocalData, cloud: CloudData): SyncPlan {
    const sessions = unionById(toValidSessions(local.sessions), toValidSessions(cloud.sessions));
    const rewards = unionById(toValidRewards(local.rewards), toValidRewards(cloud.rewards));
    const settings = resolveSettingsConflict(local.settings, cloud.settings);

    return {
        settings: settings.settings,
        sessions,
        rewards,
        uploadSessions: onlyInLocal(toValidSessions(local.sessions), toValidSessions(cloud.sessions)),
        uploadRewards: onlyInLocal(toValidRewards(local.rewards), toValidRewards(cloud.rewards)),
        uploadSettings: settings.uploadSettings,
        applyCloudSettings: settings.applyCloudSettings,
    };
}
