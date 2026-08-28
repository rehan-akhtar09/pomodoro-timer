import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth, User } from 'firebase/auth';
import { AuthService, friendlyAuthError } from '../../src/services/auth/authService';

const mocks = vi.hoisted(() => ({
    createUserWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    firebaseSignOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
    onAuthStateChanged: mocks.onAuthStateChanged,
    sendPasswordResetEmail: mocks.sendPasswordResetEmail,
    signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
    signOut: mocks.firebaseSignOut,
}));

const UNAVAILABLE_MESSAGE = 'Accounts are not available right now. Your data stays safely on this device.';

function fakeUser(overrides: Partial<User> = {}): User {
    return { uid: 'user-1', email: 'birb@example.com', displayName: 'Birb', ...overrides } as User;
}

function authError(code: string): Error {
    return Object.assign(new Error(`auth error: ${code}`), { code });
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AuthService — unavailable (Firebase not configured)', () => {
    it('reports availability based on the injected auth instance', () => {
        expect(new AuthService(null).isAvailable).toBe(false);
        expect(new AuthService({} as Auth).isAvailable).toBe(true);
    });

    it('returns null for the current user without an auth instance', () => {
        expect(new AuthService(null).getCurrentUser()).toBeNull();
    });

    it('maps the current user when an auth instance is present', () => {
        const auth = { currentUser: fakeUser() } as Auth;
        expect(new AuthService(auth).getCurrentUser()).toEqual({
            uid: 'user-1',
            email: 'birb@example.com',
            displayName: 'Birb',
        });
    });

    it('onAuthStateChange reports null immediately and returns a no-op unsubscribe', () => {
        const listener = vi.fn();
        const unsubscribe = new AuthService(null).onAuthStateChange(listener);
        expect(listener).toHaveBeenCalledWith(null);
        expect(typeof unsubscribe).toBe('function');
        expect(unsubscribe()).toBeUndefined();
    });

    it.each([
        ['createAccount', (s: AuthService) => s.createAccount('a@b.c', 'secret')],
        ['signIn', (s: AuthService) => s.signIn('a@b.c', 'secret')],
        ['signOut', (s: AuthService) => s.signOut()],
        ['sendPasswordReset', (s: AuthService) => s.sendPasswordReset('a@b.c')],
    ])('%s fails calmly when auth is unavailable', async (_name, run) => {
        const result = await run(new AuthService(null));
        expect(result.ok).toBe(false);
        expect(result.error).toBe(UNAVAILABLE_MESSAGE);
    });
});

describe('AuthService — actions with a configured auth', () => {
    it('creates an account and maps the user', async () => {
        mocks.createUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser() });
        const result = await new AuthService({} as Auth).createAccount('birb@example.com', 'secret');
        expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
            expect.anything(),
            'birb@example.com',
            'secret',
        );
        expect(result).toEqual({
            ok: true,
            user: { uid: 'user-1', email: 'birb@example.com', displayName: 'Birb' },
            error: null,
        });
    });

    it('signs in and maps the user', async () => {
        mocks.signInWithEmailAndPassword.mockResolvedValue({ user: fakeUser() });
        const result = await new AuthService({} as Auth).signIn('birb@example.com', 'secret');
        expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
            expect.anything(),
            'birb@example.com',
            'secret',
        );
        expect(result).toEqual({
            ok: true,
            user: { uid: 'user-1', email: 'birb@example.com', displayName: 'Birb' },
            error: null,
        });
    });

    it('signs out successfully', async () => {
        mocks.firebaseSignOut.mockResolvedValue(undefined);
        const result = await new AuthService({} as Auth).signOut();
        expect(mocks.firebaseSignOut).toHaveBeenCalledWith(expect.anything());
        expect(result).toEqual({ ok: true, error: null });
    });

    it('sends a password reset email', async () => {
        mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
        const result = await new AuthService({} as Auth).sendPasswordReset('birb@example.com');
        expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'birb@example.com');
        expect(result).toEqual({ ok: true, error: null });
    });
});

describe('AuthService — friendly error mapping', () => {
    it('maps a create-account failure without leaking the raw error', async () => {
        mocks.createUserWithEmailAndPassword.mockRejectedValue(authError('auth/email-already-in-use'));
        const result = await new AuthService({} as Auth).createAccount('taken@example.com', 'secret');
        expect(result).toEqual({
            ok: false,
            user: null,
            error: 'That email already has an account. Try signing in instead.',
        });
    });

    it('maps a sign-in failure to a calm message', async () => {
        mocks.signInWithEmailAndPassword.mockRejectedValue(authError('auth/wrong-password'));
        const result = await new AuthService({} as Auth).signIn('birb@example.com', 'nope');
        expect(result).toEqual({ ok: false, user: null, error: 'Incorrect password. Try again.' });
    });

    it('maps a sign-out failure to a calm message', async () => {
        mocks.firebaseSignOut.mockRejectedValue(authError('auth/network-request-failed'));
        const result = await new AuthService({} as Auth).signOut();
        expect(result).toEqual({
            ok: false,
            error: 'Network trouble — check your connection and try again.',
        });
    });

    it('maps a password-reset failure to a calm message', async () => {
        mocks.sendPasswordResetEmail.mockRejectedValue(authError('auth/invalid-email'));
        const result = await new AuthService({} as Auth).sendPasswordReset('bad');
        expect(result).toEqual({ ok: false, error: "That email address doesn't look right." });
    });
});

describe('friendlyAuthError', () => {
    it.each([
        ['auth/email-already-in-use', 'That email already has an account. Try signing in instead.'],
        ['auth/invalid-email', "That email address doesn't look right."],
        ['auth/weak-password', 'That password is too weak. Use at least 6 characters.'],
        ['auth/user-not-found', 'No account found for that email. Check it or create a new account.'],
        ['auth/wrong-password', 'Incorrect password. Try again.'],
        ['auth/too-many-requests', 'Too many attempts. Wait a moment and try again.'],
        ['auth/network-request-failed', 'Network trouble — check your connection and try again.'],
        ['auth/popup-closed-by-user', 'Sign-in was closed before it finished.'],
    ])('maps %s to a calm message', (code, message) => {
        expect(friendlyAuthError(authError(code))).toBe(message);
    });

    it('falls back to a generic message for unknown errors', () => {
        expect(friendlyAuthError(new Error('boom'))).toBe('Something went wrong. Please try again.');
        expect(friendlyAuthError('not an error')).toBe('Something went wrong. Please try again.');
        expect(friendlyAuthError(undefined)).toBe('Something went wrong. Please try again.');
    });
});

describe('AuthService — onAuthStateChanged with a configured auth', () => {
    it('forwards mapped user info and returns the SDK unsubscribe', () => {
        const unsubscribe = vi.fn();
        mocks.onAuthStateChanged.mockImplementation((_auth: Auth, listener: (user: User | null) => void) => {
            listener(fakeUser());
            return unsubscribe;
        });
        const listener = vi.fn();
        const service = new AuthService({} as Auth);
        expect(service.onAuthStateChange(listener)).toBe(unsubscribe);
        expect(listener).toHaveBeenCalledWith({
            uid: 'user-1',
            email: 'birb@example.com',
            displayName: 'Birb',
        });
    });

    it('forwards null when the SDK reports a signed-out user', () => {
        mocks.onAuthStateChanged.mockImplementation((_auth: Auth, listener: (user: User | null) => void) => {
            listener(null);
            return () => undefined;
        });
        const listener = vi.fn();
        new AuthService({} as Auth).onAuthStateChange(listener);
        expect(listener).toHaveBeenCalledWith(null);
    });
});
