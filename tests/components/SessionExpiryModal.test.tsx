import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SessionExpiryModal from '@/components/common/SessionExpiryModal';
import { clearSession, refreshAccessToken } from '@/lib/apiClient';

let tokenCookie: string | undefined;
const handleLogOut = vi.fn();
const push = vi.fn();

vi.mock('js-cookie', () => ({ default: { get: () => tokenCookie } }));
vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: () => ({ handleLogOut }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/apiClient', () => ({
  clearSession: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const mockRefresh = vi.mocked(refreshAccessToken);
const mockClear = vi.mocked(clearSession);

const NOW = new Date('2026-01-01T00:00:00Z').getTime();
const tokenExpiringIn = (ms: number) =>
  `h.${btoa(JSON.stringify({ exp: Math.floor((NOW + ms) / 1000) }))}.s`;

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('SessionExpiryModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    tokenCookie = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing without a session', async () => {
    render(<SessionExpiryModal />);
    await advance(1000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays hidden until the warning window, then shows a countdown', async () => {
    tokenCookie = tokenExpiringIn(3 * 60_000);
    render(<SessionExpiryModal />);
    await advance(1000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await advance(60_000);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Your session is about to expire');
    expect(screen.getByRole('timer')).toHaveTextContent('1:59');
  });

  it('extends the session when the user chooses to stay signed in', async () => {
    tokenCookie = tokenExpiringIn(60_000);
    mockRefresh.mockImplementation(async () => {
      tokenCookie = tokenExpiringIn(15 * 60_000);
      return tokenCookie;
    });
    render(<SessionExpiryModal />);
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    await advance(0);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();

    // The countdown was reset, so the old expiry must not sign the user out.
    await advance(2 * 60_000);
    expect(handleLogOut).not.toHaveBeenCalled();
  });

  it('signs out if extending the session fails', async () => {
    tokenCookie = tokenExpiringIn(60_000);
    mockRefresh.mockRejectedValue(new Error('refresh failed'));
    render(<SessionExpiryModal />);
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    await advance(0);

    expect(toast.error).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
    expect(handleLogOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/');
  });

  it('signs out immediately when the user chooses to', async () => {
    tokenCookie = tokenExpiringIn(60_000);
    render(<SessionExpiryModal />);
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockClear).toHaveBeenCalled();
    expect(handleLogOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/');
  });

  it('signs out when a warned session lapses, even if the warning was dismissed', async () => {
    tokenCookie = tokenExpiringIn(30_000);
    render(<SessionExpiryModal />);
    await advance(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await advance(31_000);

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(handleLogOut).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Your session has expired. Please sign in again.');
  });

  it('silently refreshes a token that expired without a warning', async () => {
    tokenCookie = tokenExpiringIn(-60_000);
    mockRefresh.mockImplementation(async () => {
      tokenCookie = tokenExpiringIn(15 * 60_000);
      return tokenCookie;
    });
    render(<SessionExpiryModal />);
    await advance(0);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(handleLogOut).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signs out when the silent refresh fails', async () => {
    tokenCookie = tokenExpiringIn(-60_000);
    mockRefresh.mockRejectedValue(new Error('refresh failed'));
    render(<SessionExpiryModal />);
    await advance(0);

    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(handleLogOut).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/');
  });
});
