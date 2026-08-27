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

  it('keeps the scene hidden from assistive technology', () => {
    const { container } = render(<Environment />);

    expect(container.querySelector('.environment__scene')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes a distinct nest/perch anchor for the reward system (Phase 4B)', () => {
    const { container } = render(<Environment />);

    const nest = container.querySelector('.environment__nest');
    expect(nest).toBeInTheDocument();
    expect(nest).toBeEmptyDOMElement();
  });

  it('renders the real cozy scene layers', () => {
    const { container } = render(<Environment />);

    expect(container.querySelector('.environment__scene')).toBeInTheDocument();
    expect(container.querySelector('.environment__window')).toBeInTheDocument();
    expect(container.querySelector('.environment__desk')).toBeInTheDocument();
    expect(container.querySelector('.environment__plant')).toBeInTheDocument();
  });
});
