import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Environment } from '../../src/components/environment/Environment';

describe('Environment', () => {
    it('renders a decorative, non-interactive background', () => {
        const { container } = render(<Environment />);

        const environment = container.querySelector('.environment');
        expect(environment).toBeInTheDocument();
        expect(environment).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps the placeholder backdrop', () => {
        const { container } = render(<Environment />);

        expect(container.querySelector('.environment__backdrop')).toBeInTheDocument();
    });
});
