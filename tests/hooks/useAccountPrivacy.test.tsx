import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_DELETION_QUERY_KEY,
  useAccountDeletionStatus,
  useExportAccountData,
  useRequestAccountDeletion,
} from '@/hooks/useAccountPrivacy';
import {
  exportAccountData,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '@/lib/accountService';

vi.mock('@/lib/accountService', () => ({
  cancelAccountDeletion: vi.fn(),
  exportAccountData: vi.fn(),
  getAccountDeletionStatus: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('account privacy hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports loading, no scheduled deletion, and a scheduled deletion', async () => {
    let finish: (value: { scheduledFor: string | null }) => void = () => {};
    vi.mocked(getAccountDeletionStatus).mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve))
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountDeletionStatus(), { wrapper });

    expect(result.current.isPending).toBe(true);
    await act(async () => finish({ scheduledFor: null }));
    await waitFor(() => expect(result.current.data).toEqual({ scheduledFor: null }));

    vi.mocked(getAccountDeletionStatus).mockResolvedValue({
      scheduledFor: '2026-11-02T12:00:00.000Z',
    });
    const scheduled = renderHook(() => useAccountDeletionStatus(), {
      wrapper: createWrapper().wrapper,
    });
    await waitFor(() =>
      expect(scheduled.result.current.data?.scheduledFor).toBe('2026-11-02T12:00:00.000Z')
    );
  });

  it('exposes deletion status failures', async () => {
    vi.mocked(getAccountDeletionStatus).mockRejectedValue(new Error('offline'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAccountDeletionStatus(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5_000 });
    expect(result.current.error).toEqual(new Error('offline'));
  });

  it('invalidates the deletion status after a successful request', async () => {
    vi.mocked(requestAccountDeletion).mockResolvedValueOnce({ scheduledFor: null });
    const { client, wrapper } = createWrapper();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
    const { result } = renderHook(() => useRequestAccountDeletion(), { wrapper });

    await act(async () => result.current.mutateAsync());

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ACCOUNT_DELETION_QUERY_KEY });
  });

  it('reports a failed account deletion request', async () => {
    vi.mocked(requestAccountDeletion).mockRejectedValue(new Error('offline'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestAccountDeletion(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('offline');
    });

    expect(toast.error).toHaveBeenCalledWith('offline');
  });

  it('turns an export response into a downloadable JSON file', async () => {
    vi.mocked(exportAccountData).mockResolvedValueOnce({ account: 'user-1' });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useExportAccountData(), { wrapper });

    await act(async () => result.current.mutateAsync());

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export');
    expect(toast.error).not.toHaveBeenCalled();
  });
});
