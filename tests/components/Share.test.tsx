import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShareModal from '@/components/common/dashboard/Share';

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMocks }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/ui/Icon', () => ({ default: () => null }));

afterEach(() => {
  toastMocks.success.mockReset();
  toastMocks.error.mockReset();
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

describe('ShareModal', () => {
  it('offers native sharing with descriptive artist-specific text', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    render(<ShareModal artistName="Burna Boy" link="https://audioblocks.com/vote/burna-boy" />);
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Listen to Burna Boy on AudioBlocks',
        text: 'Listen to Burna Boy on AudioBlocks',
        url: 'https://audioblocks.com/vote/burna-boy',
      })
    );
  });

  it('keeps the explicit Copy link action and reports clipboard failures', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareModal artistName="Burna Boy" link="https://audioblocks.com/vote/burna-boy" />);
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy link' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://audioblocks.com/vote/burna-boy')
    );
    expect(toastMocks.error).toHaveBeenCalledWith('Failed to copy link');
  });
});
