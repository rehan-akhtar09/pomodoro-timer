/**
 * Notification Service — Pomodoro Bird (Phase 5).
 *
 * Minimal, optional browser-notification wrapper (PRD.md — Notifications).
 * Everything is permission-gated and never required for the timer to function:
 * - Unsupported browsers or denied permission simply no-op.
 * - Requests never throw; callers get a calm status string to show in UI.
 * - The completion notification is fire-and-forget: a failure to notify never
 *   affects the timer, the reward flow, or the completion sound.
 */

export type NotificationPermissionState =
    | NotificationPermission
    | 'unsupported'
    | 'request-denied'
    | 'request-error';

/** Whether the browser exposes the Notification API. */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/** Current permission, or 'unsupported' outside capable browsers. */
export function getNotificationPermission(): NotificationPermissionState {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Ask for notification permission (called from a direct user interaction,
 * e.g. a button click). Resolves to a calm status string; never throws.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }
    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch {
        return 'request-error';
    }
}

/**
 * Fire a completion notification when permitted. Returns true when a
 * notification was actually shown; false otherwise (never throws).
 */
export function notifyCompletion(title: string, body: string): boolean {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return false;
    }
    try {
        new Notification(title, { body, silent: true });
        return true;
    } catch {
        return false;
    }
}
