/**
 * Local-calendar date helpers — Pomodoro Bird (Phase 4).
 *
 * All statistics grouping and streak logic use *local* calendar days (the
 * user's timezone): a "day" rolls over at local midnight, not UTC. Date keys
 * are the flat, serializable `YYYY-MM-DD` strings that will also work with the
 * future Firestore shape (architecture.md §5).
 */

/** Local calendar day key `YYYY-MM-DD` for a timestamp (ms). */
export function localDateKey(ms: number): string {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Milliseconds at the start of the local calendar day containing `ms`. */
export function startOfLocalDay(ms: number): number {
    const date = new Date(ms);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

/** Timestamp (ms) of the local midnight that a `YYYY-MM-DD` key starts at. */
export function startOfDateKey(dateKey: string): number {
    const [year = '0', month = '1', day = '1'] = dateKey.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0).getTime();
}

/** Local date key for the day `daysBefore` calendar days before `now`. */
export function dateKeyDaysAgo(now: number, daysBefore: number): string {
    const start = startOfLocalDay(now);
    // Subtract whole days from local midnight so DST-shifted days still land
    // on the previous local calendar day.
    return localDateKey(start - daysBefore * 86_400_000);
}
