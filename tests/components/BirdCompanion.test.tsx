import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BirdCompanion } from '../../src/components/bird/BirdCompanion';
import { BIRD_STATES, BIRD_STATE_IDS, timerStateToBirdState } from '../../src/components/bird/birdStates';

describe('BirdCompanion', () => {
    it('renders the idle state by default', () => {
        render(<BirdCompanion />);

        const image = screen.getByRole('img', { name: BIRD_STATES.idle.label });
        expect(image).toHaveAttribute('src', BIRD_STATES.idle.src);
        expect(image).toHaveAttribute('alt', BIRD_STATES.idle.label);
    });

    it.each(BIRD_STATE_IDS)('renders the %s state SVG', (state) => {
        render(<BirdCompanion state={state} />);

        const image = screen.getByRole('img', { name: BIRD_STATES[state].label });
        expect(image).toHaveAttribute('src', BIRD_STATES[state].src);
        expect(image).toHaveAttribute('alt', BIRD_STATES[state].label);
    });

    it('marks the rendered state on the wrapper for styling', () => {
        render(<BirdCompanion state="happy" />);

        expect(document.querySelector('[data-bird-state="happy"]')).toBeInTheDocument();
    });
});

describe('bird state mapping (timer -> bird)', () => {
    it('maps IDLE to idle', () => {
        expect(timerStateToBirdState('IDLE')).toBe('idle');
    });

    it('maps focus states to focus', () => {
        expect(timerStateToBirdState('FOCUSING')).toBe('focus');
        expect(timerStateToBirdState('FOCUS_PAUSED')).toBe('focus');
    });

    it('maps break states to break', () => {
        expect(timerStateToBirdState('SHORT_BREAK')).toBe('break');
        expect(timerStateToBirdState('SHORT_BREAK_PAUSED')).toBe('break');
        expect(timerStateToBirdState('LONG_BREAK')).toBe('break');
    });

    it('maps COMPLETED to happy', () => {
        expect(timerStateToBirdState('COMPLETED')).toBe('happy');
    });
});

describe('bird state definitions', () => {
    it('exposes exactly the five approved states with valid asset paths', () => {
        expect(BIRD_STATE_IDS).toHaveLength(5);

        for (const state of BIRD_STATE_IDS) {
            const definition = BIRD_STATES[state];
            expect(definition.src).toMatch(/^\/assets\/birds\/bird-[a-z]+\.svg$/);
            expect(definition.label.length).toBeGreaterThan(0);
        }
    });
});
