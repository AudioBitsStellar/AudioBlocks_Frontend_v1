import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getProfile, updateProfile, UpdateProfilePayload } from '@/lib/profileService';

export const PROFILE_QUERY_KEY = ['user-profile'];

export function useGetProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
    staleTime: 1000 * 60 * 5,
    retry: 1,
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
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(msg);
    },
  });
}
