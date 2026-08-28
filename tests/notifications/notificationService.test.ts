import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    getNotificationPermission,
    isNotificationSupported,
    notifyCompletion,
    requestNotificationPermission,
} from '../../src/services/notifications/notificationService';

/**
 * Replaceable Notification API. The real service only reads `permission`,
 * calls `requestPermission()`, and constructs notifications — this fake records
 * all three so every branch can be asserted without a real browser.
 */
class MockNotification {
    static permission: NotificationPermission = 'default';
    static requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted');
    static throwOnConstruct = false;
    static created: Array<{ title: string; options?: NotificationOptions }> = [];

    constructor(public title: string, public options?: NotificationOptions) {
        if (MockNotification.throwOnConstruct) {
            throw new Error('boom');
        }
        MockNotification.created.push({ title, options: this.options });
    }
}

function installNotification(permission: NotificationPermission = 'granted'): void {
    MockNotification.permission = permission;
    MockNotification.requestPermission.mockReset();
    MockNotification.requestPermission.mockResolvedValue(permission);
    MockNotification.throwOnConstruct = false;
    MockNotification.created = [];
    Object.defineProperty(window, 'Notification', {
        value: MockNotification,
        configurable: true,
        writable: true,
    });
}

function removeNotification(): void {
    delete (window as { Notification?: unknown }).Notification;
}

afterEach(() => {
    removeNotification();
    vi.restoreAllMocks();
});

describe('notificationService — support detection', () => {
    it('reports unsupported when the browser has no Notification API', () => {
        removeNotification();
        expect(isNotificationSupported()).toBe(false);
    });

    it('reports supported when the Notification API exists', () => {
        installNotification('default');
        expect(isNotificationSupported()).toBe(true);
    });
});

describe('notificationService — permission', () => {
    it('returns unsupported when the browser has no Notification API', () => {
        removeNotification();
        expect(getNotificationPermission()).toBe('unsupported');
    });

    it('returns the current permission from the browser', () => {
        installNotification('granted');
        expect(getNotificationPermission()).toBe('granted');

        installNotification('denied');
        expect(getNotificationPermission()).toBe('denied');
    });

    it('returns unsupported for a request without the API', async () => {
        removeNotification();
        await expect(requestNotificationPermission()).resolves.toBe('unsupported');
    });

    it('resolves with the granted permission', async () => {
        installNotification('granted');
        await expect(requestNotificationPermission()).resolves.toBe('granted');
        expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
    });

    it('maps a rejected request to request-error without throwing', async () => {
        installNotification('default');
        MockNotification.requestPermission.mockRejectedValueOnce(new Error('boom'));
        await expect(requestNotificationPermission()).resolves.toBe('request-error');
    });
});

describe('notificationService — notifyCompletion', () => {
    it('returns false when the browser is unsupported', () => {
        removeNotification();
        expect(notifyCompletion('Focus complete', 'Time for a break — well done.')).toBe(false);
    });

    it('returns false when permission is not granted', () => {
        installNotification('denied');
        expect(notifyCompletion('Focus complete', 'body')).toBe(false);
        expect(MockNotification.created).toHaveLength(0);
    });

    it('shows a silent notification when permission is granted', () => {
        installNotification('granted');
        const shown = notifyCompletion('Focus complete', 'Time for a break — well done.');

        expect(shown).toBe(true);
        expect(MockNotification.created).toHaveLength(1);
        expect(MockNotification.created[0].title).toBe('Focus complete');
        expect(MockNotification.created[0].options).toEqual({
            body: 'Time for a break — well done.',
            silent: true,
        });
    });

    it('returns false when the constructor throws', () => {
        installNotification('granted');
        MockNotification.throwOnConstruct = true;

        expect(notifyCompletion('Focus complete', 'body')).toBe(false);
    });
});
