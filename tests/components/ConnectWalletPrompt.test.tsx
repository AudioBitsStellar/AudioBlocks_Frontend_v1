import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConnectWalletPrompt from '@/components/auth/ConnectWalletPrompt';
import { AUTH_ROLE_SELECTED_EVENT } from '@/lib/authRoles';

// The app-wide Modal renders through a portal and is already covered by its
// own tests; assert on the prompt's own behaviour.
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    open,
    onClose,
    children,
    title,
  }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div aria-label={title} role="dialog">
        <button aria-label="Close" onClick={onClose} />
        {children}
      </div>
    ) : null,
}));

const dispatch = (role: string) => new CustomEvent(AUTH_ROLE_SELECTED_EVENT, { detail: { role } });

describe('ConnectWalletPrompt (#476)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while closed', () => {
    render(<ConnectWalletPrompt open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders differentiated listener and artist options when open', () => {
    render(<ConnectWalletPrompt open onClose={() => {}} />);

    expect(screen.getByText('I want to listen')).toBeInTheDocument();
    expect(screen.getByText('I am an artist')).toBeInTheDocument();
  });

  it('announces the listener role and closes on selection', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const eventSpy = vi.fn();
    window.addEventListener(AUTH_ROLE_SELECTED_EVENT, eventSpy);

    render(<ConnectWalletPrompt open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /I want to listen/i }));

    await waitFor(() => expect(eventSpy).toHaveBeenCalledTimes(1));
    expect(dispatch('listener')).toBeTruthy(); // sanity: event shape
    expect(onClose).toHaveBeenCalled();
    window.removeEventListener(AUTH_ROLE_SELECTED_EVENT, eventSpy);
  });

  it('announces the artist role on artist selection', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const eventSpy = vi.fn();
    window.addEventListener(AUTH_ROLE_SELECTED_EVENT, eventSpy);

    render(<ConnectWalletPrompt open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /I am an artist/i }));

    await waitFor(() => {
      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ role: 'artist' });
    });
    expect(onClose).toHaveBeenCalled();
    window.removeEventListener(AUTH_ROLE_SELECTED_EVENT, eventSpy);
  });
});
