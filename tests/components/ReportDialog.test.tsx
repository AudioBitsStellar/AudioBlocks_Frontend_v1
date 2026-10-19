import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportDialog } from '@/components/common/ReportDialog';
import { ApiError } from '@/lib/apiClient';
import { submitReport } from '@/lib/reportService';
import { hasAuthSession } from '@/lib/session';
import { toast } from 'sonner';

vi.mock('@/lib/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reportService')>();
  return { ...actual, submitReport: vi.fn() };
});

vi.mock('@/lib/session', () => ({
  hasAuthSession: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockSubmit = vi.mocked(submitReport);
const mockHasSession = vi.mocked(hasAuthSession);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ReportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSession.mockReturnValue(true);
    mockSubmit.mockResolvedValue(undefined);
  });

  it('asks signed-out users to sign in instead of showing the form', async () => {
    mockHasSession.mockReturnValue(false);

    render(<ReportDialog open target={{ kind: 'song', id: 'song-1' }} onClose={vi.fn()} />, {
      wrapper,
    });

    expect(await screen.findByText('Sign in to report a song.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit report' })).not.toBeInTheDocument();
  });

  it('keeps submit disabled until a reason is chosen, then submits the report', async () => {
    const onClose = vi.fn();
    render(<ReportDialog open target={{ kind: 'song', id: 'song-1' }} onClose={onClose} />, {
      wrapper,
    });

    const submit = await screen.findByRole('button', { name: 'Submit report' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'copyright' } });
    expect(submit).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Details (optional)'), {
      target: { value: 'Not my track' },
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        { kind: 'song', id: 'song-1' },
        'copyright',
        'Not my track'
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('offers comment reasons for comment targets', async () => {
    render(<ReportDialog open target={{ kind: 'comment', id: 7 }} onClose={vi.fn()} />, {
      wrapper,
    });

    const reason = await screen.findByLabelText('Reason');
    expect(reason).toHaveTextContent('Harassment');
    expect(reason).not.toHaveTextContent('Copyright infringement');
  });

  it('tells the user when they have already reported the content', async () => {
    mockSubmit.mockRejectedValueOnce(new ApiError('HTTP error! status: 409', 409));
    const onClose = vi.fn();
    render(<ReportDialog open target={{ kind: 'song', id: 'song-1' }} onClose={onClose} />, {
      wrapper,
    });

    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'spam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("You've already reported this."));
    expect(onClose).toHaveBeenCalled();
  });
});
