import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardNotFound from '@/app/dashboard/not-found';
import NotFound from '@/app/not-found';

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('Not-Found Pages (#142)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Root NotFound', () => {
    it('renders as a standalone terminal page without redirecting', () => {
      render(<NotFound />);

      expect(screen.getByRole('heading', { level: 1, name: 'Page Not Found' })).toBeInTheDocument();
      expect(screen.getByText(/Double-check the URL and try again/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('prominently displays a Go Home link pointing to "/"', () => {
      render(<NotFound />);

      const homeLink = screen.getByRole('link', { name: /Go Home/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('calls history.back() when history entries exist', () => {
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      Object.defineProperty(window.history, 'length', { value: 3, configurable: true });

      render(<NotFound />);

      const backButton = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(backButton);

      expect(historyBackSpy).toHaveBeenCalled();
      historyBackSpy.mockRestore();
    });

    it('falls back to router.push("/") when history is empty', () => {
      Object.defineProperty(window.history, 'length', { value: 1, configurable: true });

      render(<NotFound />);

      const backButton = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Dashboard NotFound', () => {
    it('renders 404 message and dashboard link', () => {
      render(<DashboardNotFound />);

      expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
      const dashboardLink = screen.getByRole('link', { name: /Go to Dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('handles back button navigation safely', () => {
      const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      Object.defineProperty(window.history, 'length', { value: 2, configurable: true });

      render(<DashboardNotFound />);

      const backButton = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(backButton);

      expect(historyBackSpy).toHaveBeenCalled();
      historyBackSpy.mockRestore();
    });
  });
});
