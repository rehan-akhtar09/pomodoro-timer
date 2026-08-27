import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Environment } from '../../src/components/environment/Environment';
import { MAX_VISIBLE_GIFTS } from '../../src/utils/rewards';
import type { GiftRecord } from '../../src/types/rewards';

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

describe('Environment — gift rendering (Phase 4B)', () => {
  function gift(id: string, earnedAt: number, rarity: GiftRecord['rarity']): GiftRecord {
    return {
      id,
      sessionId: `focus:1500000:1:shortBreak:${earnedAt}`,
      type: 'feather',
      rarity,
      earnedAt,
    };
  }

  it('renders earned gifts inside the nest anchor', () => {
    const { container } = render(
      <Environment rewards={[gift('g1', 1000, 'common'), gift('g2', 2000, 'rare')]} />,
    );

    const nest = container.querySelector('.environment__nest');
    expect(nest).not.toBeEmptyDOMElement();
    expect(container.querySelectorAll('.environment__gift')).toHaveLength(2);
    expect(container.querySelector('.environment__gift--common')).toBeInTheDocument();
    expect(container.querySelector('.environment__gift--rare')).toBeInTheDocument();
  });

  it('shows at most MAX_VISIBLE_GIFTS while the collection keeps growing', () => {
    const rewards: GiftRecord[] = [];
    for (let i = 0; i < MAX_VISIBLE_GIFTS + 6; i += 1) {
      rewards.push(gift(`g${i}`, i + 1, 'common'));
    }

    const { container } = render(<Environment rewards={rewards} />);

    expect(container.querySelectorAll('.environment__gift')).toHaveLength(MAX_VISIBLE_GIFTS);
  });

  it('marks only the newest visible gift with the delivery animation class', () => {
    const { container } = render(
      <Environment rewards={[gift('g1', 1000, 'common'), gift('g2', 2000, 'common')]} />,
    );

    const newGifts = container.querySelectorAll('.environment__gift--new');
    expect(newGifts).toHaveLength(1);
  });
});
