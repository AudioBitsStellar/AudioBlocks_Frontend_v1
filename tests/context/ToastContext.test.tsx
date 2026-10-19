import { render, screen, act, renderHook, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '@/context/ToastContext';

// Render a plain element so the test exercises the provider, not framer-motion.
vi.mock('@/components/ui/Toast', () => ({
  Toast: ({
    toast,
    onDismiss,
  }: {
    toast: { id: string; type: string; title: string };
    onDismiss: (id: string) => void;
  }) => (
    <div data-testid="toast" data-type={toast.type}>
      {toast.title}
      <button onClick={() => onDismiss(toast.id)}>dismiss-{toast.title}</button>
    </div>
  ),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when useToast is used outside the provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used inside ToastProvider',
    );
    consoleSpy.mockRestore();
  });

  it('renders a toast with its title and type', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ type: 'success', title: 'Saved' });
    });

    const toast = screen.getByTestId('toast');
    expect(toast).toHaveTextContent('Saved');
    expect(toast).toHaveAttribute('data-type', 'success');
  });

  it('auto-dismisses a non-persistent toast after the default 3000ms', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.info('Heads up');
    });
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('respects a custom duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ type: 'info', title: 'Quick', duration: 500 });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText('Quick')).not.toBeInTheDocument();
  });

  it('treats error toasts as persistent and never auto-dismisses them', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.error('Something broke');
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('treats duration 0 as persistent', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ type: 'info', title: 'Sticky', duration: 0 });
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('dismiss removes a toast immediately', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.toast({ type: 'info', title: 'Bye' });
    });
    expect(id).toMatch(/^toast-/);

    act(() => {
      result.current.dismiss(id);
    });
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
  });

  it('dismissing via the rendered toast removes it', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('Done');
    });

    fireEvent.click(screen.getByText('dismiss-Done'));
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('shows at most 3 toasts, dropping the oldest', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.toast({ type: 'error', title: 'one' });
      result.current.toast({ type: 'error', title: 'two' });
      result.current.toast({ type: 'error', title: 'three' });
      result.current.toast({ type: 'error', title: 'four' });
    });

    expect(screen.queryByText('one')).not.toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(screen.getByText('four')).toBeInTheDocument();
  });

  it('success, error and info helpers create toasts of the matching type', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success('ok-title', 'ok-message');
      result.current.info('info-title');
    });

    expect(screen.getByText('ok-title')).toHaveAttribute('data-type', 'success');
    expect(screen.getByText('info-title')).toHaveAttribute('data-type', 'info');
  });
});
