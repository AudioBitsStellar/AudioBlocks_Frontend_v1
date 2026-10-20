import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/apiClient';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import {
  listSubscriptionGifts,
  respondToGift,
  searchUsersByUsername,
  sendSubscriptionGift,
  type SendGiftInput,
} from '@/lib/giftService';
import { subscriptionKeys } from '@/hooks/useSubscription';

export const giftKeys = {
  all: ['subscription-gifts'] as const,
};

export function useSubscriptionGifts(enabled = true) {
  return useQuery({
    queryKey: giftKeys.all,
    queryFn: listSubscriptionGifts,
    enabled,
    staleTime: CACHE_DURATIONS.VERY_SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useSendGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendGiftInput) => sendSubscriptionGift(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftKeys.all });
      toast.success('Gift sent. The recipient can accept it in their settings.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not send the gift. Please try again.'));
    },
  });
}

export function useRespondToGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ giftId, action }: { giftId: string; action: 'accept' | 'decline' }) =>
      respondToGift(giftId, action),
    onSuccess: (_data, { action }) => {
      void queryClient.invalidateQueries({ queryKey: giftKeys.all });
      if (action === 'accept') {
        void queryClient.invalidateQueries({ queryKey: subscriptionKeys.current });
        toast.success('Gift accepted. Your plan has been updated.');
      } else {
        toast.success('Gift declined.');
      }
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not update this gift. Please try again.'));
    },
  });
}

/** Runs a username search on demand. It is a mutation so typing does not fetch every user. */
export function useRecipientSearch() {
  return useMutation({
    mutationFn: (query: string) => searchUsersByUsername(query),
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not search users. Please try again.'));
    },
  });
}
