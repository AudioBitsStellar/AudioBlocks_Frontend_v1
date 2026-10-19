import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import type { AuthRole } from '@/lib/authRoles';
import {
  getProfile,
  updateAccountType,
  updateProfile,
  UpdateProfilePayload,
} from '@/lib/profileService';

export const PROFILE_QUERY_KEY = ['user-profile'];

export function useGetProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

/**
 * Saves the onboarding role (#596). On success the profile query is refetched,
 * so role-dependent UI (and the redirect check) sees the new value right away.
 * Callers handle their own error copy so the selection can be retried.
 */
export function useSetAccountType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountType: AuthRole) => updateAccountType(accountType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toast.success('Profile updated successfully!');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(msg);
    },
  });
}
