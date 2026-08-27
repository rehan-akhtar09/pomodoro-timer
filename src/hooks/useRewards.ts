/**
 * useRewards — React binding around the persisted gift collection (Phase 4B).
 *
 * Loads once on mount (lazy init), subscribes to the timer's completion event
 * (focus sessions only), and persists through the Reward Service / Storage
 * Service. Skipped sessions emit no completion event (rules.md §4) and breaks
 * are filtered by the Reward Service, so only naturally completed focus
 * sessions can ever add a gift.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { rewardService } from '../services/rewards/rewardService';
import type { GiftRecord } from '../types/rewards';
import type { SessionCompletionEvent } from './usePomodoro';

export interface UseRewardsResult {
    /** The full persisted gift collection (newest last). */
    rewards: GiftRecord[];
    /** Hand a completion event to the reward service (focus sessions only). */
    recordReward: (event: SessionCompletionEvent) => void;
}

export function useRewards(): UseRewardsResult {
    // Lazy init reads storage exactly once on mount; corrupt/missing data
    // falls back to an empty collection without throwing.
    const [rewards, setRewards] = useState<GiftRecord[]>(() => rewardService.loadRewards());

    // The persist effect would otherwise rewrite the just-loaded value on the
    // first render; skip that no-op write (same pattern as useSettings).
    const skipFirstPersistRef = useRef(true);

    useEffect(() => {
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        // Failed writes are non-fatal: the collection keeps updating in memory
        // and the gifts simply won't survive a reload (graceful degradation).
        rewardService.saveRewards(rewards);
    }, [rewards]);

    const recordReward = useCallback((event: SessionCompletionEvent) => {
        setRewards((current) => {
            const result = rewardService.grantToCollection(current, event);
            return result?.granted ? result.rewards : current;
        });
    }, []);

    return { rewards, recordReward };
}
