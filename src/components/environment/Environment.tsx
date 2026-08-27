import './Environment.css';

import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { GiftRecord } from '../../types/rewards';
import { selectVisibleGifts } from '../../utils/rewards';

/**
 * Layout slots for the nest (design.md §16 — at most 12 visible gifts at once).
 * Ordered back-row → front-row so the newest gift (last in the visible window)
 * lands front-and-center. Percentages are relative to the nest container.
 */
const GIFT_SLOTS: ReadonlyArray<{
  x: number;
  y: number;
  rotate: number;
  scale: number;
}> = [
    { x: 18, y: 32, rotate: -12, scale: 0.75 },
    { x: 48, y: 26, rotate: 6, scale: 0.85 },
    { x: 78, y: 32, rotate: 14, scale: 0.75 },
    { x: 6, y: 54, rotate: -8, scale: 0.95 },
    { x: 30, y: 50, rotate: 4, scale: 1.05 },
    { x: 58, y: 56, rotate: -5, scale: 0.95 },
    { x: 86, y: 52, rotate: 10, scale: 1.0 },
    { x: 14, y: 76, rotate: 6, scale: 1.05 },
    { x: 44, y: 78, rotate: -6, scale: 1.12 },
    { x: 72, y: 74, rotate: 4, scale: 1.05 },
    { x: 30, y: 92, rotate: -4, scale: 0.95 },
    { x: 58, y: 90, rotate: 8, scale: 1.0 },
  ];

interface EnvironmentProps {
  /** Full gift collection; only the newest `MAX_VISIBLE_GIFTS` are displayed. */
  rewards?: readonly GiftRecord[];
}

/**
 * Environment — the cozy room scene behind the bird (Phase 3), extended by the
 * Phase 4B reward system to display earned gifts inside the nest.
 *
 * Drawn as a single layered inline SVG so the whole scene stays one
 * replaceable, self-contained visual layer — independent of the bird
 * (architecture.md §3) and the timer. The scene is purely decorative, so it is
 * hidden from assistive technology with `aria-hidden="true"` (gift data is
 * surfaced through the SessionStats panel, not the nest).
 *
 * The `.environment__nest` element is the stable anchor where accumulated
 * gifts render. Only the newest `MAX_VISIBLE_GIFTS` are shown (design.md §16);
 * the full collection stays persisted regardless of what the nest displays.
 * Reduced-motion users get instant placement (usePrefersReducedMotion) instead
 * of the short delivery animation.
 */
export function Environment({ rewards = [] }: EnvironmentProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Display-only cap — never prunes the collection (design.md §16).
  const visibleGifts = selectVisibleGifts([...rewards]);

  return (
    <div className="environment" aria-hidden="true">
      <svg
        className="environment__scene"
        viewBox="0 0 560 420"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="env-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf6ea" />
            <stop offset="1" stopColor="#f4ecda" />
          </linearGradient>
          <linearGradient id="env-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e7f3f4" />
            <stop offset="1" stopColor="#cfe4e6" />
          </linearGradient>
          <linearGradient id="env-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efe7d3" />
            <stop offset="1" stopColor="#e5dbc1" />
          </linearGradient>
          <radialGradient id="env-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f3b45b" stopOpacity="0.4" />
            <stop offset="1" stopColor="#f3b45b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft wall */}
        <rect className="environment__wall" width="560" height="420" fill="url(#env-wall)" />

        {/* Gentle sun pool near the window */}
        <circle className="environment__sunpool" cx="130" cy="120" r="110" fill="url(#env-sun)" />

        {/* Window — the light source */}
        <g className="environment__window">
          <rect x="50" y="45" width="160" height="150" rx="8" fill="#e4ded1" />
          <rect x="60" y="55" width="140" height="130" rx="4" fill="url(#env-glass)" />
          <line x1="130" y1="55" x2="130" y2="185" stroke="#e4ded1" strokeWidth="8" />
          <line x1="60" y1="120" x2="200" y2="120" stroke="#e4ded1" strokeWidth="8" />
        </g>
        <rect x="44" y="195" width="172" height="12" rx="4" fill="#d8b084" />

        {/* Small framed picture on the wall (hidden on small screens) */}
        <g className="environment__picture">
          <rect x="420" y="55" width="100" height="80" rx="6" fill="#e4ded1" />
          <rect x="428" y="63" width="84" height="64" rx="3" fill="#fdf9ef" />
          <circle cx="465" cy="85" r="8" fill="#f3b45b" />
          <path d="M428 127 L428 104 C 446 88, 466 98, 484 86 L512 86 L512 127 Z" fill="#78c6c8" />
          <path d="M428 127 L428 118 C 452 100, 478 116, 512 108 L512 127 Z" fill="#79b77a" />
        </g>

        {/* Floor and baseboard */}
        <rect
          className="environment__floor"
          x="0"
          y="285"
          width="560"
          height="135"
          fill="url(#env-floor)"
        />
        <rect x="0" y="280" width="560" height="8" fill="#e4ded1" />

        {/* Rug beneath the nest */}
        <ellipse className="environment__rug" cx="280" cy="375" rx="150" ry="28" fill="#efe4c8" />
        <ellipse cx="280" cy="375" rx="105" ry="18" fill="#e7d9b4" />

        {/* Potted plant */}
        <g className="environment__plant">
          <path
            d="M92 232 C 78 260, 74 292, 92 320"
            fill="none"
            stroke="#5f9d61"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse cx="88" cy="252" rx="17" ry="34" fill="#79b77a" transform="rotate(-20 88 252)" />
          <ellipse cx="106" cy="282" rx="15" ry="30" fill="#5f9d61" transform="rotate(6 106 282)" />
          <ellipse cx="86" cy="300" rx="14" ry="26" fill="#79b77a" transform="rotate(-38 86 300)" />
          <ellipse
            cx="114"
            cy="312"
            rx="13"
            ry="22"
            fill="#79b77a"
            transform="rotate(30 114 312)"
          />
          <rect x="78" y="344" width="40" height="9" rx="4" fill="#c08f66" />
          <path d="M84 353 L116 353 L122 392 L78 392 Z" fill="#cf9d76" />
        </g>

        {/* Small desk with a book, notebook, and mug */}
        <g className="environment__desk">
          <rect x="420" y="206" width="72" height="26" rx="4" fill="#78c6c8" />
          <rect x="402" y="230" width="96" height="32" rx="5" fill="#79b77a" />
          <rect x="410" y="252" width="80" height="7" rx="2" fill="#fdf6e6" />
          <rect x="382" y="238" width="24" height="26" rx="5" fill="#f3b45b" />
          <path
            d="M404 246 Q 414 242 412 252"
            fill="none"
            stroke="#f3b45b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="375" y="262" width="183" height="38" rx="7" fill="#d8b084" />
          <rect x="375" y="292" width="183" height="7" rx="3" fill="#cfa06b" />
          <rect x="390" y="299" width="13" height="89" rx="4" fill="#b98a5e" />
          <rect x="530" y="299" width="13" height="89" rx="4" fill="#b98a5e" />
        </g>
      </svg>

      {/* Phase 4B — the nest where earned gifts accumulate. */}
      <div className="environment__nest">
        {visibleGifts.map((gift, index) => {
          const slot = GIFT_SLOTS[index % GIFT_SLOTS.length];
          const isNewest = index === visibleGifts.length - 1;
          return (
            <div
              key={gift.id}
              className={[
                'environment__gift',
                `environment__gift--${gift.rarity}`,
                !prefersReducedMotion && isNewest ? 'environment__gift--new' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <img
                src={`/assets/gifts/${gift.type}.svg`}
                alt=""
                style={{
                  transform: `translate(-50%, -50%) rotate(${slot.rotate}deg) scale(${slot.scale})`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Soft window-light shimmer (slow, calm, reduced-motion aware). */}
      <div className="environment__shimmer" />
    </div>
  );
}
