/**
 * SessionStats — Phase 4 statistics readout (design.md §3: "Sessions: 3 /
 * Streak: 4"). Purely presentational: values are derived by useSessionStats
 * from the persisted session history. The empty state uses the calm, inviting
 * copy from design.md §13 rather than a guilt-based message (§15).
 */

import type { SessionStats as SessionStatsData } from '../../types/stats';
import './SessionStats.css';

interface SessionStatsProps {
    stats: SessionStatsData;
}

export function SessionStats({ stats }: SessionStatsProps) {
    const hasSessions = stats.totalFocusSessions > 0;

    return (
        <section className="session-stats" aria-label="Session statistics">
            {hasSessions ? (
                <dl className="session-stats__list">
                    <div className="session-stats__item">
                        <dt className="session-stats__label">Focus sessions today</dt>
                        <dd className="session-stats__value">{stats.todayFocusSessions}</dd>
                    </div>
                    <div className="session-stats__item">
                        <dt className="session-stats__label">Focus minutes today</dt>
                        <dd className="session-stats__value">{stats.todayFocusMinutes}</dd>
                    </div>
                    <div className="session-stats__item">
                        <dt className="session-stats__label">Total sessions</dt>
                        <dd className="session-stats__value">{stats.totalFocusSessions}</dd>
                    </div>
                    <div className="session-stats__item">
                        <dt className="session-stats__label">Day streak</dt>
                        <dd className="session-stats__value">{stats.streak}</dd>
                    </div>
                </dl>
            ) : (
                <p className="session-stats__empty">
                    No sessions yet. Complete a focus session to start tracking.
                </p>
            )}
        </section>
    );
}
