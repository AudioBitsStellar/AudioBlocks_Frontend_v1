import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SupportWidget } from '@/components/common/SupportWidget';
import { submitFeedback } from '@/lib/feedbackService';
import { hasAuthSession } from '@/lib/session';

const mockUsePathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/lib/feedbackService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/feedbackService')>();
  return { ...actual, submitFeedback: vi.fn() };
});

vi.mock('@/lib/session', () => ({
  hasAuthSession: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSubmit = vi.mocked(submitFeedback);
const mockHasSession = vi.mocked(hasAuthSession);

function renderWidget() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<SupportWidget />, { wrapper: Wrapper });
}

describe('SupportWidget (#857)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
    mockHasSession.mockReturnValue(true);
    mockSubmit.mockResolvedValue(undefined);
  });

  it('renders nothing on the embeddable player route', () => {
    mockUsePathname.mockReturnValue('/embed/song/123');
    renderWidget();
    expect(screen.queryByLabelText('Support and feedback')).not.toBeInTheDocument();
  });

  it('opens the dialog with a mailto contact link', () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('Support and feedback'));
    expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute(
      'href',
      'mailto:support@audioblocks.com'
    );
  });

  it('does not show an email field for a signed-in listener', () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('Support and feedback'));
    expect(screen.queryByLabelText(/your email/i)).not.toBeInTheDocument();
  });

  it('shows an optional email field for a signed-out visitor', () => {
    mockHasSession.mockReturnValue(false);
    renderWidget();
    fireEvent.click(screen.getByLabelText('Support and feedback'));
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
  });

  it('submits feedback and closes the dialog', async () => {
    renderWidget();
    fireEvent.click(screen.getByLabelText('Support and feedback'));
    fireEvent.change(screen.getByLabelText('Send feedback'), {
      target: { value: 'This is great' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('This is great', undefined));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
