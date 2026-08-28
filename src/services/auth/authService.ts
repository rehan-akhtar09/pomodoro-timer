/**
 * AuthService — optional Firebase Authentication wrapper (Accounts & Cloud Sync phase).
 *
 * Stays framework-independent so tests and any future mobile layer can use the
 * same interface. Requires the caller to supply an `Auth` instance (obtained
 * from `firebaseClient`); when that is null (Firebase not configured) every
 * method degrades gracefully with `ok: false` and a calm message instead of
 * throwing — the app remains fully usable local-only (PRD.md — no account
 * required).
 *
 * Errors are never surfaced raw: every failure maps to a friendly, human
 * readable message (design.md §13 — no raw exceptions).
 */

import type { Auth, User } from 'firebase/auth';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';

/** Public, safe subset of a Firebase user exposed to the UI. */
export interface AuthUserInfo {
    uid: string;
    email: string | null;
    displayName: string | null;
}

/** Result of an account action — never throws to the caller. */
export interface AuthActionResult {
    ok: boolean;
    /** The signed-in user when the action succeeded (create/sign-in only). */
    user: AuthUserInfo | null;
    /** Calm, human-readable message when `ok` is false. */
    error: string | null;
}

/** Result of sign-out / password reset — simple success or friendly failure. */
export interface SimpleAuthResult {
    ok: boolean;
    error: string | null;
}

const UNAVAILABLE_MESSAGE = 'Accounts are not available right now. Your data stays safely on this device.';

/**
 * Map an unknown thrown value to a calm, human-readable message. Raw SDK
 * exceptions must never reach the UI (design.md §13).
 */
export function friendlyAuthError(error: unknown): string {
    const code =
        error instanceof Error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    switch (code) {
        case 'auth/email-already-in-use':
            return 'That email already has an account. Try signing in instead.';
        case 'auth/invalid-email':
            return "That email address doesn't look right.";
        case 'auth/weak-password':
            return 'That password is too weak. Use at least 6 characters.';
        case 'auth/user-not-found':
            return 'No account found for that email. Check it or create a new account.';
        case 'auth/wrong-password':
            return 'Incorrect password. Try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Wait a moment and try again.';
        case 'auth/network-request-failed':
            return 'Network trouble — check your connection and try again.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in was closed before it finished.';
        default:
            return 'Something went wrong. Please try again.';
    }
}

function toUserInfo(user: User | null): AuthUserInfo | null {
    if (user === null) {
        return null;
    }
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
    };
}

export class AuthService {
    constructor(private readonly auth: Auth | null) { }

    /** True when Firebase Auth is configured; false → local-only mode. */
    get isAvailable(): boolean {
        return this.auth !== null;
    }

    /** The currently known signed-in user, or null when signed out. */
    getCurrentUser(): AuthUserInfo | null {
        if (this.auth === null) {
            return null;
        }
        return toUserInfo(this.auth.currentUser);
    }

    /**
     * Subscribe to auth state changes (Firebase restores sessions
     * asynchronously, so this is how the UI learns the user is signed in).
     * Returns an unsubscribe function.
     */
    onAuthStateChange(listener: (user: AuthUserInfo | null) => void): () => void {
        if (this.auth === null) {
            listener(null);
            return () => undefined;
        }
        return onAuthStateChanged(this.auth, (user) => listener(toUserInfo(user)));
    }

    /** Create a new account with email + password. */
    async createAccount(email: string, password: string): Promise<AuthActionResult> {
        if (this.auth === null) {
            return { ok: false, user: null, error: UNAVAILABLE_MESSAGE };
        }
        try {
            const { user } = await createUserWithEmailAndPassword(this.auth, email, password);
            return { ok: true, user: toUserInfo(user), error: null };
        } catch (error) {
            return { ok: false, user: null, error: friendlyAuthError(error) };
        }
    }

    /** Sign in with email + password. */
    async signIn(email: string, password: string): Promise<AuthActionResult> {
        if (this.auth === null) {
            return { ok: false, user: null, error: UNAVAILABLE_MESSAGE };
        }
        try {
            const { user } = await signInWithEmailAndPassword(this.auth, email, password);
            return { ok: true, user: toUserInfo(user), error: null };
        } catch (error) {
            return { ok: false, user: null, error: friendlyAuthError(error) };
        }
    }

    /** Sign the current user out (safe no-op when already signed out). */
    async signOut(): Promise<SimpleAuthResult> {
        if (this.auth === null) {
            return { ok: false, error: UNAVAILABLE_MESSAGE };
        }
        try {
            await firebaseSignOut(this.auth);
            return { ok: true, error: null };
        } catch (error) {
            return { ok: false, error: friendlyAuthError(error) };
        }
    }

    /** Send a password recovery email to the given address. */
    async sendPasswordReset(email: string): Promise<SimpleAuthResult> {
        if (this.auth === null) {
            return { ok: false, error: UNAVAILABLE_MESSAGE };
        }
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { ok: true, error: null };
        } catch (error) {
            return { ok: false, error: friendlyAuthError(error) };
        }
    }
}
