import { useCallback, useEffect, useRef } from 'react';
import { BirdCompanion } from './components/bird/BirdCompanion';
import { timerStateToBirdState } from './components/bird/birdStates';
import { Environment } from './components/environment/Environment';
import { SettingsPanel, type AccountProps } from './components/settings/SettingsPanel';
import { SessionStats as SessionStatsPanel } from './components/stats/SessionStats';
import { Timer } from './components/timer/Timer';
import { TimerControls } from './components/timer/TimerControls';
import { TimerProgress } from './components/timer/TimerProgress';
import { useAuth } from './hooks/useAuth';
import { usePomodoro, type SessionCompletionEvent } from './hooks/usePomodoro';
import { useRewards } from './hooks/useRewards';
import { useSessionStats } from './hooks/useSessionStats';
import { useSettings } from './hooks/useSettings';
import { useSync } from './hooks/useSync';
import type { GiftRecord } from './types/rewards';
import type { SessionRecord, SessionStats } from './types/stats';
import type { TimerSettings, TimerState } from './types/timer';
import { deriveSessionStats } from './utils/sessionStats';
import './App.css';

/**
 * TimerWorkspace — the local-first timer UI, keyed by user so it re-mounts on
 * sign-in/sign-out. Data hooks lazy-init from localStorage on mount; the App
 * shell only mounts this after the one-time cloud merge has written the merged
 * truth to localStorage (useSync), so the hooks pick it up.
 *
 * Cloud writes happen here at the App shell (never inside usePomodoro — it has
 * no start event, rules.md §6): session completion pushes the record + derived
 * stats, settings pushes only on explicit user updates, rewards pushes via a
 * change effect (one write per grant), and a fresh FOCUSING transition pushes
 * the session-start timestamp. No per-tick countdown write exists anywhere.
 */
interface TimerWorkspaceProps {
    account: AccountProps;
    pushSession: (record: SessionRecord) => void;
    pushSessionStart: (startedAt: number) => void;
    pushStatistics: (stats: SessionStats) => void;
    pushSettings: (next: TimerSettings) => void;
    pushRewards: (rewards: GiftRecord[]) => void;
}

function TimerWorkspace({
    account,
    pushSession,
    pushSessionStart,
    pushStatistics,
    pushSettings,
    pushRewards,
}: TimerWorkspaceProps) {
    const { settings, saveFailed, updateSettings } = useSettings();
    const { sessions, stats, recordSession } = useSessionStats();
    const { rewards, recordReward } = useRewards();

    // Settings sync only on explicit user updates (the merge already handled
    // the signed-in state, so a broad change effect could clobber cloud data).
    const handleUpdateSettings = useCallback(
        (next: TimerSettings): boolean => {
            const ok = updateSettings(next);
            if (ok) {
                pushSettings(next);
            }
            return ok;
        },
        [updateSettings, pushSettings],
    );

    // One completion handler feeds stats history, rewards, and cloud sync —
    // no second completion-detection mechanism (rules.md §6).
    const handleSessionComplete = useCallback(
        (event: SessionCompletionEvent) => {
            const record = recordSession(event);
            recordReward(event);
            if (record !== null) {
                pushSession(record);
                pushStatistics(deriveSessionStats([...sessions, record], Date.now()));
            }
        },
        [recordSession, recordReward, pushSession, pushStatistics, sessions],
    );

    const { state, mode, remainingMs, durationMs, start, pause, resume, reset, skip } = usePomodoro(
        settings,
        handleSessionComplete,
    );

    // Session-start sync: usePomodoro emits no start event, so detect the
    // transition INTO FOCUSING at the shell. A resume from FOCUS_PAUSED is not
    // a new start, so it is excluded.
    const prevStateRef = useRef<TimerState | null>(null);
    useEffect(() => {
        const prev = prevStateRef.current;
        prevStateRef.current = state;
        if (prev !== null && state === 'FOCUSING' && prev !== 'FOCUSING' && prev !== 'FOCUS_PAUSED') {
            pushSessionStart(Date.now());
        }
    }, [state, pushSessionStart]);

    // Rewards sync: one write per grant. The first render (lazy init after a
    // merge) is skipped — the merge already wrote the merged collection.
    const skipFirstRewardsPushRef = useRef(true);
    useEffect(() => {
        if (skipFirstRewardsPushRef.current) {
            skipFirstRewardsPushRef.current = false;
            return;
        }
        pushRewards(rewards);
    }, [rewards, pushRewards]);

    const birdState = timerStateToBirdState(state);

    return (
        <>
            <div className="scene">
                <Environment rewards={rewards} />
                <div className="scene__bird">
                    <BirdCompanion state={birdState} />
                </div>
            </div>

            <section className="timer-panel" aria-label="Timer">
                <Timer state={state} mode={mode} remainingMs={remainingMs} />
                <TimerProgress
                    state={state}
                    mode={mode}
                    remainingMs={remainingMs}
                    durationMs={durationMs}
                />
                <TimerControls
                    state={state}
                    onStart={start}
                    onPause={pause}
                    onResume={resume}
                    onReset={reset}
                    onSkip={skip}
                />
            </section>

            <SessionStatsPanel stats={stats} />

            <SettingsPanel
                settings={settings}
                saveFailed={saveFailed}
                updateSettings={handleUpdateSettings}
                account={account}
            />
        </>
    );
}

/**
 * App — application shell.
 *
 * Owns the optional account + cloud sync layers. When signed out (or Firebase
 * not configured) the workspace runs fully local-only (PRD.md). On sign-in the
 * one-time merge runs; the workspace mounts once it settles so the data hooks
 * lazy-init from the merged data. A calm status line communicates syncing and
 * sync failures without blocking the timer (design.md §13).
 */
export function App() {
    const { user, busy, available, createAccount, signIn, signOut, sendPasswordReset } = useAuth();
    const {
        status: syncStatus,
        error: syncError,
        pushSession,
        pushSessionStart,
        pushStatistics,
        pushSettings,
        pushRewards,
    } = useSync(user);

    const account: AccountProps = {
        user,
        busy,
        available,
        createAccount,
        signIn,
        signOut,
        sendPasswordReset,
    };

    // Hold the workspace until the one-time merge settles so its data hooks
    // lazy-init from merged localStorage (they re-mount per uid via `key`).
    const syncing = user !== null && (syncStatus === 'idle' || syncStatus === 'syncing');
    const syncReady = !syncing;

    return (
        <div className="app">
            <header className="app__header">
                <h1 className="app__title">Pomodoro Bird</h1>
            </header>

            <main className="app__main">
                {syncing && (
                    <p className="app__sync" role="status">
                        Syncing your data…
                    </p>
                )}

                {syncReady && (
                    <TimerWorkspace
                        key={user?.uid ?? 'local'}
                        account={account}
                        pushSession={pushSession}
                        pushSessionStart={pushSessionStart}
                        pushStatistics={pushStatistics}
                        pushSettings={pushSettings}
                        pushRewards={pushRewards}
                    />
                )}
            </main>

            {syncStatus === 'error' && syncError !== null && (
                <p className="app__sync-error" role="status">
                    {syncError}
                </p>
            )}

            <footer className="app__footer">
                <p>Stay calm. Stay focused.</p>
            </footer>
        </div>
    );
}
