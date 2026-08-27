/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for Pomodoro Bird.
// The Vitest `test` block keeps tests co-located with the Vite pipeline
// so the project does not need a separate test runner configuration.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
        css: false,
    },
});
