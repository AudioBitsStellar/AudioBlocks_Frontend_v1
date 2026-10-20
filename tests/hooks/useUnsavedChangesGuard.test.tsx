import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    pushMock.mockClear();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });

  it('requests the native browser warning while dirty', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('opens the dialog for an internal link and navigates only after confirmation', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const link = document.createElement('a');
    link.href = '/dashboard/settings';
    document.body.append(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    act(() => link.dispatchEvent(click));

    expect(click.defaultPrevented).toBe(true);
    expect(result.current.isDialogOpen).toBe(true);
    expect(pushMock).not.toHaveBeenCalled();

    act(() => result.current.leaveWithoutSaving());

    expect(pushMock).toHaveBeenCalledWith('/dashboard/settings');
    expect(result.current.isDialogOpen).toBe(false);
  });

  it('stays on the page when the dialog is dismissed', () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const link = document.createElement('a');
    link.href = '/dashboard/settings';
    document.body.append(link);

    act(() => link.click());
    act(() => result.current.stay());

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.isDialogOpen).toBe(false);
  });

  it('does not intercept external links or clicks when clean', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), {
      initialProps: { dirty: true },
    });
    const externalLink = document.createElement('a');
    externalLink.href = 'https://example.com';
    document.body.append(externalLink);
    const externalClick = new MouseEvent('click', { bubbles: true, cancelable: true });

    act(() => externalLink.dispatchEvent(externalClick));
    expect(externalClick.defaultPrevented).toBe(false);

    rerender({ dirty: false });
    const internalLink = document.createElement('a');
    internalLink.href = '/dashboard/settings';
    document.body.append(internalLink);
    const internalClick = new MouseEvent('click', { bubbles: true, cancelable: true });

    act(() => internalLink.dispatchEvent(internalClick));

    expect(internalClick.defaultPrevented).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
