import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Icon, { type IconName } from '@/components/ui/Icon';

describe('Icon', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders the selected sprite icon at the requested size', () => {
    const { container } = render(
      <Icon
        aria-hidden={false}
        aria-label="Search"
        className="custom-icon"
        name="search"
        size="lg"
      />
    );
    const icon = container.querySelector('svg');

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('width', '24');
    expect(icon).toHaveAttribute('height', '24');
    expect(icon).toHaveClass('custom-icon');
    expect(icon.querySelector('use')).toHaveAttribute('href', '/icons/sprite.svg#search');
    expect(icon).toHaveAttribute('style', 'color: inherit;');
  });

  it('defaults to medium size and decorative accessibility', () => {
    const { container } = render(<Icon name="heart" />);
    const icon = container.querySelector('svg');

    expect(icon).toHaveAttribute('width', '20');
    expect(icon).toHaveAttribute('height', '20');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['sm', 16],
    ['md', 20],
    ['lg', 24],
    ['xl', 32],
  ] as const)('maps %s size to %i pixels', (size, dimension) => {
    const { container } = render(<Icon name="heart" size={size} />);

    expect(container.querySelector('svg')).toHaveAttribute('width', String(dimension));
    expect(container.querySelector('svg')).toHaveAttribute('height', String(dimension));
  });

  it('allows aria-hidden to be disabled', () => {
    const { container } = render(<Icon aria-hidden={false} aria-label="Music" name="music" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'false');
  });

  it('warns when an unknown icon name is used in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<Icon name={'missing-icon' as IconName} />);

    expect(warning).toHaveBeenCalledWith('[Icon] Missing icon name: missing-icon');
  });
});
