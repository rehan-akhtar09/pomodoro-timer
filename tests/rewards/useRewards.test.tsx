import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRewards } from '../../src/hooks/useRewards';
import { rewardService } from '../../src/services/rewards/rewardService';
import type { GiftRecord } from '../../src/types/rewards';
import type { SessionCompletionEvent } from '../../src/hooks/usePomodoro';

function gift(id: string, earnedAt: number, type = 'feather'): GiftRecord {
    return {
        id,
        sessionId: `focus:1500000:1:shortBreak:${earnedAt}`,
        type,
        rarity: 'common',
        earnedAt,
    };
}

function focusEvent(overrides: Partial<SessionCompletionEvent> = {}): SessionCompletionEvent {
    return {
        mode: 'focus',
        completedFocusInCycle: 1,
        nextMode: 'shortBreak',
        durationMs: 25 * 60_000,
        ...overrides,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useRewards', () => {
    it('loads the persisted collection on mount', () => {
        const persisted = [gift('g1', 1000), gift('g2', 2000)];
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue(persisted);

        const { result } = renderHook(() => useRewards());

        expect(result.current.rewards).toEqual(persisted);
    });

    it('starts empty when nothing is persisted', () => {
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue([]);

        const { result } = renderHook(() => useRewards());

        expect(result.current.rewards).toEqual([]);
    });

    it('appends a gift for a completed focus session and persists', () => {
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue([]);
        const saveSpy = vi.spyOn(rewardService, 'saveRewards').mockReturnValue(true);

        const { result } = renderHook(() => useRewards());

        const event = focusEvent();
        act(() => {
            result.current.recordReward(event);
        });

        expect(result.current.rewards).toHaveLength(1);
        expect(result.current.rewards[0].sessionId).toMatch(/^focus:/);
        expect(saveSpy).toHaveBeenCalledWith(result.current.rewards);
    });

    it('does not change state for a completed break session', () => {
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue([]);
        const saveSpy = vi.spyOn(rewardService, 'saveRewards').mockReturnValue(true);

        const { result } = renderHook(() => useRewards());

        act(() => {
            result.current.recordReward({
                mode: 'shortBreak',
                completedFocusInCycle: 1,
                nextMode: 'focus',
                durationMs: 5 * 60_000,
            });
        });

        expect(result.current.rewards).toEqual([]);
        expect(saveSpy).not.toHaveBeenCalled();
    });

    it('keeps one reward when the same focus event is delivered twice (StrictMode guard)', () => {
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue([]);
        const saveSpy = vi.spyOn(rewardService, 'saveRewards').mockReturnValue(true);

        const { result } = renderHook(() => useRewards());

        const event = focusEvent();
        act(() => {
            result.current.recordReward(event);
        });
        act(() => {
            result.current.recordReward(event);
        });

        expect(result.current.rewards).toHaveLength(1);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('does not persist anything on the initial mount', () => {
        vi.spyOn(rewardService, 'loadRewards').mockReturnValue([]);
        const saveSpy = vi.spyOn(rewardService, 'saveRewards').mockReturnValue(true);

        renderHook(() => useRewards());

        expect(saveSpy).not.toHaveBeenCalled();
    });
});
