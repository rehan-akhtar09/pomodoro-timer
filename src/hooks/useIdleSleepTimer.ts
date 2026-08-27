import { useEffect, useState } from 'react';
import type { BirdState } from '../components/bird/birdStates';

/**
 * How long the timer must stay idle before the bird falls asleep.
 * User-approved Phase 2 assumption: 5 minutes of continuous IDLE.
 */
export const IDLE_SLEEP_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Bird-layer-only sleep trigger (architecture.md §3 "rest/sleep -> sleeping").
 *
 * The timer engine has no sleeping TimerState, so the bird falls asleep on its
 * own when the displayed bird state has been `idle` continuously for
 * IDLE_SLEEP_TIMEOUT_MS with no interaction. Any change to the timer state
 * (START, PAUSE, RESUME, RESET, SKIP) changes the bird state away from `idle`
 * and wakes the bird immediately. No TimerState or timer-engine changes.
 */
export function useIdleSleepTimer(state: BirdState): BirdState {
    const [isSleeping, setIsSleeping] = useState(false);

    useEffect(() => {
        if (state !== 'idle') {
            setIsSleeping(false);
            return;
        }

        const timerId = window.setTimeout(() => setIsSleeping(true), IDLE_SLEEP_TIMEOUT_MS);
        return () => window.clearTimeout(timerId);
    }, [state]);

    return isSleeping ? 'sleeping' : state;
}
