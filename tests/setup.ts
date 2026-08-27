import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs with `globals: false`, so RTL cannot register its own
// auto-cleanup. Unmount rendered trees after every test to avoid
// accumulated DOM between tests.
afterEach(() => {
    cleanup();
});
