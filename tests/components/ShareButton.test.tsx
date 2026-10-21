import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShareButton from '@/components/ui/ShareButton';

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMocks }));

function mockNavigatorShare(canShare: boolean, share = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: vi.fn().mockReturnValue(canShare),
  });
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  return share;
}

function mockClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

afterEach(() => {
  toastMocks.success.mockReset();
  toastMocks.error.mockReset();
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

describe('ShareButton', () => {
  it('uses the native share sheet when canShare accepts the URL', async () => {
    const share = mockNavigatorShare(true);
    render(
      <ShareButton
        text="Listen to Ada on AudioBlocks"
        title="Ada on AudioBlocks"
        url="https://audioblocks.com/artist/ada"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Ada on AudioBlocks',
        text: 'Listen to Ada on AudioBlocks',
        url: 'https://audioblocks.com/artist/ada',
      })
    );
    expect(toastMocks.success).toHaveBeenCalledWith('Shared successfully');
  });

  it('copies the URL when native sharing is not supported', async () => {
    mockNavigatorShare(false);
    const writeText = mockClipboard();
    render(<ShareButton url="https://audioblocks.com/artist/ada" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://audioblocks.com/artist/ada')
    );
    expect(toastMocks.success).toHaveBeenCalledWith('Link copied to clipboard');
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('does not show an error when the user cancels native sharing', async () => {
    const abortError = Object.assign(new Error('Share cancelled'), { name: 'AbortError' });
    const share = mockNavigatorShare(true, vi.fn().mockRejectedValue(abortError));
    mockClipboard();
    render(<ShareButton url="https://audioblocks.com/artist/ada" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('shows an error if clipboard access fails', async () => {
    mockNavigatorShare(false);
    mockClipboard(vi.fn().mockRejectedValue(new Error('Permission denied')));
    render(<ShareButton url="https://audioblocks.com/artist/ada" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith('Unable to copy link. Please try again.')
    );
  });
});
