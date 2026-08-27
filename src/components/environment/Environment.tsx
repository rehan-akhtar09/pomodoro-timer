import './Environment.css';

/**
 * Environment — the cozy visual scene behind the bird.
 *
 * Phase 0 foundation: a replaceable, self-contained background layer.
 * The real illustrated environment asset (e.g. `cozy-room.webp`, per
 * architecture.md §2) will be added here later without touching the bird
 * or the timer. The environment must never compete visually with the timer.
 */
export function Environment() {
    return (
        <div className="environment" aria-hidden="true">
            <div className="environment__backdrop" />
        </div>
    );
}
