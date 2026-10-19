import type { ReactNode } from 'react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrivacyDataSection from '@/components/settings/PrivacyDataSection';
import {
  cancelAccountDeletion,
  exportAccountData,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '@/lib/accountService';

vi.mock('@/lib/accountService', () => ({
  ACCOUNT_DELETION_CONFIRMATION_PHRASE: 'DELETE MY ACCOUNT',
  cancelAccountDeletion: vi.fn(),
  exportAccountData: vi.fn(),
  getAccountDeletionStatus: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));
vi.mock('@/hooks/useAnalyticsConsent', () => ({ useAnalyticsConsent: () => 'unset' }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<PrivacyDataSection />, { wrapper });
}

describe('PrivacyDataSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccountDeletionStatus).mockResolvedValue({ scheduledFor: null });
  });

  it('keeps export busy and disabled while the download request is pending', async () => {
    let finish: (data: unknown) => void = () => {};
    vi.mocked(exportAccountData).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderSection();

    const download = screen.getByRole('button', { name: 'Download' });
    await user.click(download);
    expect(download).toBeDisabled();
    expect(download).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(download).toHaveTextContent('Preparing…'));

    finish({ ok: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled());
  });

  it('requires the confirmation phrase before requesting account deletion', async () => {
    vi.mocked(requestAccountDeletion).mockResolvedValueOnce({ scheduledFor: null });
    const user = userEvent.setup();
    renderSection();

    const submit = await screen.findByRole('button', { name: 'Delete account' });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByLabelText(/Type DELETE MY ACCOUNT to confirm/),
      'DELETE MY ACCOUNT'
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(requestAccountDeletion).toHaveBeenCalledTimes(1));
  });

  it('shows an accessible message when account deletion fails', async () => {
    vi.mocked(requestAccountDeletion).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    renderSection();

    await screen.findByRole('button', { name: 'Delete account' });
    await user.type(
      screen.getByLabelText(/Type DELETE MY ACCOUNT to confirm/),
      'DELETE MY ACCOUNT'
    );
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not schedule account deletion. Please try again.'
    );
  });

  it('shows the scheduled date and lets the user cancel deletion', async () => {
    vi.mocked(getAccountDeletionStatus).mockResolvedValueOnce({
      scheduledFor: '2026-11-02T12:00:00.000Z',
    });
    vi.mocked(cancelAccountDeletion).mockResolvedValueOnce(undefined);
    renderSection();

    expect(await screen.findByText(/Your account will be deleted on/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel deletion' }));
    await waitFor(() => expect(cancelAccountDeletion).toHaveBeenCalledTimes(1));
  });

  it('shows an accessible message when deletion status fails to load', async () => {
    vi.mocked(getAccountDeletionStatus).mockRejectedValue(new Error('offline'));
    renderSection();

    await waitFor(
      () =>
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Could not load account deletion status. Please try again.'
        ),
      { timeout: 5_000 }
    );
  });

  it('shows an accessible message when data export fails', async () => {
    vi.mocked(exportAccountData).mockRejectedValueOnce(new Error('offline'));
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not export your data. Please try again later.'
    );
  });
});
