/**
 * Audio asset URLs — Pomodoro Bird (Phase 5).
 *
 * Local, optimized assets under `public/assets/audio/` (rules.md — audio: use
 * a small curated set of local assets). The Audio Service only ever references
 * these URLs through its config, so the timer never depends on them existing:
 * missing/corrupt files degrade to calm in-app feedback, never an error.
 *
 * Placeholder-note: licensed tracks are dropped in by the project owner to
 * match these names (focus loop, break/ambient loop, completion chime).
 */
import type { AudioTrackUrls } from './audioService';

export const AUDIO_TRACK_URLS: AudioTrackUrls = {
    focus: '/assets/audio/focus-loop.mp3',
    break: '/assets/audio/break-loop.mp3',
    completion: '/assets/audio/completion-chime.mp3',
};
