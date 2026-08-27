import { useCallback } from 'react';
import { BirdCompanion } from './components/bird/BirdCompanion';
import { timerStateToBirdState } from './components/bird/birdStates';
import { Environment } from './components/environment/Environment';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { SessionStats } from './components/stats/SessionStats';
import { Timer } from './components/timer/Timer';
import { TimerControls } from './components/timer/TimerControls';
import { TimerProgress } from './components/timer/TimerProgress';
import { usePomodoro } from './hooks/usePomodoro';
import { useRewards } from './hooks/useRewards';
import { useSessionStats } from './hooks/useSessionStats';
import { useSettings } from './hooks/useSettings';
import type { SessionCompletionEvent } from './hooks/usePomodoro';
import './App.css';

/**
 * App — application shell.
 *
 * Composes the environment + bird scene and the Phase 1 timer (display,
 * progress, controls) driven by the `usePomodoro` hook. The bird state is
 * derived from the timer state through the single shared mapping. Settings
 * are loaded/persisted via `useSettings` (Phase 4) and drive the timer.
 * Completed sessions feed the stats history through the `onSessionComplete`
 * extension point (skipped sessions are never recorded).
 */
export function App() {
    const { settings, saveFailed, updateSettings } = useSettings();
    const { stats, recordSession } = useSessionStats();
    const { rewards, recordReward } = useRewards();

    // One completion handler feeds both the stats history and the reward
    // system through the timer's single `onSessionComplete` extension point —
    // no second completion-detection mechanism (rules.md §6).
    const handleSessionComplete = useCallback(
        (event: SessionCompletionEvent) => {
            recordSession(event);
            recordReward(event);
        },
        [recordSession, recordReward],
    );

    const { state, mode, remainingMs, durationMs, start, pause, resume, reset, skip } = usePomodoro(
        settings,
        handleSessionComplete,
    );

    const birdState = timerStateToBirdState(state);

    return (
        <div className="app">
            <header className="app__header">
                <h1 className="app__title">Pomodoro Bird</h1>
            </header>

            <main className="app__main">
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

                <SessionStats stats={stats} />

                <SettingsPanel
                    settings={settings}
                    saveFailed={saveFailed}
                    updateSettings={updateSettings}
                />
            </main>

            <footer className="app__footer">
                <p>Stay calm. Stay focused.</p>
            </footer>
        </div>
    );
}
