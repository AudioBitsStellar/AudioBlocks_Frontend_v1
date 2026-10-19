'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RETRY_CONFIG } from '@/lib/constants';
import {
  cancelAccountDeletion,
  exportAccountData,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '@/lib/accountService';

export const ACCOUNT_DELETION_QUERY_KEY = ['account-deletion'];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Pending account deletion for the signed-in user (#598). */
export function useAccountDeletionStatus() {
  return useQuery({
    queryKey: ACCOUNT_DELETION_QUERY_KEY,
    queryFn: getAccountDeletionStatus,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useRequestAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestAccountDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY });
      toast.success('Account deletion scheduled. You can cancel it until then.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not schedule account deletion. Please try again.'));
    },
  });
}

export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_DELETION_QUERY_KEY });
      toast.success('Account deletion cancelled.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not cancel account deletion. Please try again.'));
    },
  });
}

/** Downloads the user's data as a JSON file once the export resolves. */
export function useExportAccountData() {
  return useMutation({
    mutationFn: async () => {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audioblocks-data-export.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not export your data. Please try again later.'));
    },
  });
}
