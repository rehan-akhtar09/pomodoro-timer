import { useState } from 'react';
import { BirdCompanion } from './components/bird/BirdCompanion';
import type { BirdState } from './components/bird/birdStates';
import { Environment } from './components/environment/Environment';
import './App.css';

/**
 * App — application shell for Phase 0.
 *
 * Composes the base layout: header, environment + bird scene, and a
 * placeholder timer area. The real timer arrives in Phase 1 and will
 * drive the bird state through application state (Phase 2).
 */
export function App() {
    // Phase 0 placeholder: the timer controller will supply this later.
    const [birdState] = useState<BirdState>('idle');

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

                <section className="timer-placeholder" aria-label="Timer">
                    <p className="timer-placeholder__time" aria-hidden="true">
                        25:00
                    </p>
                    <p className="timer-placeholder__label">Focus time</p>
                    <p className="timer-placeholder__note">Timer arrives in Phase 1.</p>
                </section>
            </main>

            <footer className="app__footer">
                <p>Stay calm. Stay focused.</p>
            </footer>
        </div>
    );
}
