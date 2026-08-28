/**
 * useAuth — React binding around the AuthService (Accounts & Cloud Sync phase).
 *
 * Follows the same shape as useSettings/useRewards: a shared service instance,
 * lazy state, and no throwing. When Firebase is not configured the service
 * degrades gracefully (every action returns a calm error) and the account UI
 * hides itself via `available` — the timer stays fully local-only (PRD.md).
 *
 * Firebase restores sessions asynchronously, so initial status is `unknown`
 * and `onAuthStateChange` resolves it without blocking the UI (design.md §13).
 */

import { useCallback, useEffect, useState } from 'react';
import { firebaseClient } from '../lib/firebase';
import {
    AuthService,
    type AuthActionResult,
    type AuthUserInfo,
    type SimpleAuthResult,
} from '../services/auth/authService';

/** Shared service instance used by the app; tests may spy on it. */
export const authService = new AuthService(firebaseClient.getAuth());

/** Session state: `unknown` until Firebase resolves the restored session. */
export type AuthStatus = 'unknown' | 'signedOut' | 'signedIn';

export interface UseAuthResult {
    /** The signed-in user, or null when signed out. */
    user: AuthUserInfo | null;
    /** 'unknown' (resolving session) | 'signedOut' | 'signedIn'. */
    status: AuthStatus;
    /** True while an auth action is in flight (non-blocking UI). */
    busy: boolean;
    /** False when Firebase is not configured → hide the account UI. */
    available: boolean;
    createAccount: (email: string, password: string) => Promise<AuthActionResult>;
    signIn: (email: string, password: string) => Promise<AuthActionResult>;
    signOut: () => Promise<SimpleAuthResult>;
    sendPasswordReset: (email: string) => Promise<SimpleAuthResult>;
}

export function useAuth(service: AuthService = authService): UseAuthResult {
    const [user, setUser] = useState<AuthUserInfo | null>(() => service.getCurrentUser());
    const [status, setStatus] = useState<AuthStatus>('unknown');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const unsubscribe = service.onAuthStateChange((next) => {
            setUser(next);
            setStatus(next !== null ? 'signedIn' : 'signedOut');
        });
        return unsubscribe;
    }, [service]);

    const runAction = useCallback(
        async <T>(action: () => Promise<T>): Promise<T> => {
            setBusy(true);
            try {
                return await action();
            } finally {
                setBusy(false);
            }
        },
        [],
    );

    const createAccount = useCallback(
        (email: string, password: string) => runAction(() => service.createAccount(email, password)),
        [runAction, service],
    );

    const signIn = useCallback(
        (email: string, password: string) => runAction(() => service.signIn(email, password)),
        [runAction, service],
    );

    const signOut = useCallback(() => runAction(() => service.signOut()), [runAction, service]);

    const sendPasswordReset = useCallback(
        (email: string) => runAction(() => service.sendPasswordReset(email)),
        [runAction, service],
    );

    return {
        user,
        status,
        busy,
        available: service.isAvailable,
        createAccount,
        signIn,
        signOut,
        sendPasswordReset,
    };
}
