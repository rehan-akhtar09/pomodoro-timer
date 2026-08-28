/**
 * useNotificationPermission — React binding for the optional browser
 * Notification API (Phase 5). Mirrors the calm, never-throws contract of the
 * Notification Service: unsupported browsers and denied permissions degrade to
 * a quiet status string instead of an error. The permission request is only
 * ever triggered by a direct user interaction (rules.md — notifications).
 */
import { useCallback, useState } from 'react';
import {
    getNotificationPermission,
    requestNotificationPermission,
    type NotificationPermissionState,
} from '../services/notifications/notificationService';

export interface UseNotificationPermissionResult {
    /** Current permission state ('default' while never asked, etc.). */
    permission: NotificationPermissionState;
    /** True while a permission request is in flight. */
    requesting: boolean;
    /** Ask the browser for permission (call from a direct user interaction). */
    request: () => Promise<NotificationPermissionState>;
}

export function useNotificationPermission(): UseNotificationPermissionResult {
    const [permission, setPermission] = useState<NotificationPermissionState>(() =>
        getNotificationPermission(),
    );
    const [requesting, setRequesting] = useState(false);

    const request = useCallback(async (): Promise<NotificationPermissionState> => {
        setRequesting(true);
        try {
            const next = await requestNotificationPermission();
            setPermission(next);
            return next;
        } finally {
            setRequesting(false);
        }
    }, []);

    return { permission, requesting, request };
}
