import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reports whether the user prefers reduced motion (design.md §9 Accessibility).
 *
 * BirdCompanion uses this to omit all motion classes entirely rather than
 * relying only on the global CSS override, which keeps the behavior explicit
 * and testable. Falls back to `false` when `matchMedia` is unavailable.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(
        () =>
            typeof window.matchMedia === 'function'
                ? window.matchMedia(REDUCED_MOTION_QUERY).matches
                : false,
    );

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            return;
        }

        const media = window.matchMedia(REDUCED_MOTION_QUERY);
        const onChange = () => setReduced(media.matches);
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    return reduced;
}
