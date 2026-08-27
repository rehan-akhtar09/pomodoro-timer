import { BirdCompanion } from './components/bird/BirdCompanion';
import { timerStateToBirdState } from './components/bird/birdStates';
import { Environment } from './components/environment/Environment';
import { Timer } from './components/timer/Timer';
import { TimerControls } from './components/timer/TimerControls';
import { TimerProgress } from './components/timer/TimerProgress';
import { usePomodoro } from './hooks/usePomodoro';
import './App.css';

/**
 * App — application shell.
 *
 * Composes the environment + bird scene and the Phase 1 timer (display,
 * progress, controls) driven by the `usePomodoro` hook. The bird state is
 * derived from the timer state through the single shared mapping.
 */
export function App() {
    const { state, mode, remainingMs, durationMs, start, pause, resume, reset, skip } = usePomodoro();

    const birdState = timerStateToBirdState(state);

    return (
        <div className="app">
            <header className="app__header">
                <h1 className="app__title">Pomodoro Bird</h1>
            </header>

            <main className="app__main">
                <div className="scene">
                    <Environment />
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
            </main>

            <footer className="app__footer">
                <p>Stay calm. Stay focused.</p>
            </footer>
        </div>
    );
}
