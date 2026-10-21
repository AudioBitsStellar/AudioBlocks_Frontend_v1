import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const toastError = vi.fn();
let signedIn = true;

vi.mock('@/lib/apiClient', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));
vi.mock('@/hooks/useHasAuthSession', () => ({ useHasAuthSession: () => signedIn }));
vi.mock('@/components/auth/ConnectWalletPrompt', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Connect your wallet</div> : null,
}));
vi.mock('@/lib/commentReactionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/commentReactionService')>()),
  getCurrentUserId: () => 'me',
}));

import { CommentReactions } from '@/components/common/dashboard/CommentReactions';

const summary = (like: number, heart: number, fire: number, mine: string[] = []) => ({
  data: {
    reactions: [
      { type: 'like', count: like, users: mine.includes('like') ? [{ id: 'me' }] : [] },
      { type: 'heart', count: heart, users: mine.includes('heart') ? [{ id: 'me' }] : [] },
      { type: 'fire', count: fire, users: [] },
    ],
  },
});

describe('CommentReactions (#577)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedIn = true;
  });

  it('shows counts and marks the reaction the current user chose', async () => {
    get.mockResolvedValue(summary(3, 1, 0, ['heart']));
    render(<CommentReactions commentId="c1" />);
    expect(await screen.findByRole('button', { name: 'Like (3)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Heart (1)' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: 'Like (3)' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(get).toHaveBeenCalledWith('/api/comments/c1/reactions');
  });

  it('toggles optimistically and keeps the change when the API succeeds', async () => {
    get.mockResolvedValue(summary(3, 0, 0));
    let resolvePost: (v: unknown) => void = () => {};
    post.mockReturnValue(new Promise((r) => (resolvePost = r)));
    render(<CommentReactions commentId="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Like (3)' }));

    // Updated before the API answers.
    const liked = screen.getByRole('button', { name: 'Like (4)' });
    expect(liked.getAttribute('aria-pressed')).toBe('true');
    expect(post).toHaveBeenCalledWith('/api/comments/c1/reactions', { type: 'like' });

    resolvePost({ data: { added: true, type: 'like' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Like (4)' })).toBeTruthy());
    expect(toastError).not.toHaveBeenCalled();
  });

  it('rolls back and shows an error when the API call fails', async () => {
    get.mockResolvedValue(summary(2, 0, 0, ['like']));
    post.mockRejectedValue(new Error('500'));
    render(<CommentReactions commentId="c1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Like (2)' }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const like = screen.getByRole('button', { name: 'Like (2)' });
    expect(like.getAttribute('aria-pressed')).toBe('true');
  });

  it('signed-out users see counts, and clicking prompts login instead of reacting', async () => {
    signedIn = false;
    get.mockResolvedValue(summary(5, 0, 0));
    const onPromptOpenChange = vi.fn();
    render(<CommentReactions commentId="c1" onPromptOpenChange={onPromptOpenChange} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Like (5)' }));

    expect(screen.getByRole('dialog').textContent).toContain('Connect your wallet');
    expect(onPromptOpenChange).toHaveBeenCalledWith(true);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Like (5)' })).toBeTruthy();
  });
});
