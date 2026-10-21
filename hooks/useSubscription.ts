import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/apiClient';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import {
  cancelSubscription,
  fetchCurrentSubscription,
  fetchSubscriptionTiers,
  startSubscription,
  type SubscriptionTier,
} from '@/lib/subscriptionService';

export const subscriptionKeys = {
  tiers: ['subscription-tiers'] as const,
  current: ['subscription-current'] as const,
};

/** Plans from the backend. They change rarely, so they are cached for a long time. */
export function useSubscriptionTiers() {
  return useQuery({
    queryKey: subscriptionKeys.tiers,
    queryFn: fetchSubscriptionTiers,
    staleTime: CACHE_DURATIONS.LONG,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useCurrentSubscription(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.current,
    queryFn: fetchCurrentSubscription,
    enabled,
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useStartSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tier: SubscriptionTier) => startSubscription(tier),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.current });
      toast.success('Your plan has been updated.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not update your plan. Please try again.'));
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.current });
      toast.success('Subscription cancelled. Your access continues until the end date.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not cancel your subscription. Please try again.'));
    },
  });
}
