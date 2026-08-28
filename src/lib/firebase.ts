/**
 * Firebase client initialization — Pomodoro Bird (Accounts & Cloud Sync phase).
 *
 * The web SDK is configured EXCLUSIVELY from `import.meta.env.VITE_FIREBASE_*`
 * environment variables (rules.md §6 — never hardcode keys in source). When the
 * variables are absent (fresh clone, `.env.local` missing), every accessor
 * returns null and the app stays fully local-only: accounts and cloud sync
 * gracefully degrade without breaking the timer (PRD.md — no account required).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/** The full Firebase web-app configuration (Firebase console → Web app). */
export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

/** Env variable names the web config maps from (names only — never values). */
const REQUIRED_ENV_KEYS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Read the Firebase web config from Vite env vars. Returns null when any value
 * is missing or blank so callers can degrade to local-only mode.
 */
export function readFirebaseConfig(
    env: Record<string, string | undefined> = import.meta.env,
): FirebaseConfig | null {
    const missing = REQUIRED_ENV_KEYS.filter((key) => !env[key]?.trim());
    if (missing.length > 0) {
        if (import.meta.env.DEV) {
            console.warn('[firebase] configuration incomplete; staying local-only.', missing);
        }
        return null;
    }
    return {
        apiKey: env.VITE_FIREBASE_API_KEY as string,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
        projectId: env.VITE_FIREBASE_PROJECT_ID as string,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
        appId: env.VITE_FIREBASE_APP_ID as string,
    };
}

/**
 * Lazy Firebase client. Initializes only when the config is present and valid;
 * otherwise `auth` and `db` stay null and the app remains local-only.
 */
class FirebaseClient {
    private readonly config: FirebaseConfig | null;
    private app: FirebaseApp | null = null;
    private auth: Auth | null = null;
    private db: Firestore | null = null;

    constructor() {
        this.config = readFirebaseConfig();
        if (this.config !== null) {
            this.app = initializeApp({
                apiKey: this.config.apiKey,
                authDomain: this.config.authDomain,
                projectId: this.config.projectId,
                storageBucket: this.config.storageBucket,
                messagingSenderId: this.config.messagingSenderId,
                appId: this.config.appId,
            });
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
        }
    }

    /** True when Firebase is configured; false → the app runs local-only. */
    get isConfigured(): boolean {
        return this.config !== null;
    }

    /** The Auth instance, or null when Firebase is not configured. */
    getAuth(): Auth | null {
        return this.auth;
    }

    /** The Firestore instance, or null when Firebase is not configured. */
    getFirestore(): Firestore | null {
        return this.db;
    }
}

/** Shared instance used by the app; tests may construct their own. */
export const firebaseClient = new FirebaseClient();
