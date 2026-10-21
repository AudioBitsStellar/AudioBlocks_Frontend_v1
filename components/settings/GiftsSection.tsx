'use client';

import type { ReactNode } from 'react';
import ErrorState from '@/components/common/ErrorState';
import { useRespondToGift, useSubscriptionGifts } from '@/hooks/useGifts';
import { useGetProfile } from '@/hooks/useProfile';
import { useSubscriptionTiers } from '@/hooks/useSubscription';
import type { GiftStatus, SubscriptionGift } from '@/lib/giftService';
import { formatSubscriptionDate } from '@/lib/subscriptionService';

const STATUS_LABELS: Record<GiftStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

/** Received gifts can be accepted or declined. Sent gifts show their status (#585). */
export default function GiftsSection() {
  const profileQuery = useGetProfile();
  const giftsQuery = useSubscriptionGifts();
  const tiersQuery = useSubscriptionTiers();
  const respond = useRespondToGift();

  const myId = profileQuery.data?.id;
  const gifts = giftsQuery.data ?? [];
  const received = gifts.filter((gift) => gift.recipientId === myId);
  const sent = gifts.filter((gift) => gift.senderId === myId);

  const tierName = (tier: string) =>
    tiersQuery.data?.find((option) => option.tier === tier)?.displayName ?? tier;

  const renderReceived = (gift: SubscriptionGift) => (
    <li key={gift.id} className="p-4 rounded-lg border border-gray-700 bg-[#1E1E1E] space-y-2">
      <div className="font-medium text-white">{tierName(gift.tier)} gift</div>
      {gift.message && <p className="text-sm text-gray-300">&ldquo;{gift.message}&rdquo;</p>}
      <div className="text-xs text-gray-400">
        {gift.status === 'pending' && gift.expiresAt
          ? `Accept by ${formatSubscriptionDate(gift.expiresAt)}`
          : STATUS_LABELS[gift.status]}
      </div>
      {gift.status === 'pending' && (
        <div className="flex gap-3 pt-1">
          <button
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D2045B] hover:bg-[#b0034c] rounded-lg transition-colors disabled:opacity-50"
            disabled={respond.isPending}
            type="button"
            onClick={() => respond.mutate({ giftId: gift.id, action: 'accept' })}
          >
            Accept
          </button>
          <button
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            disabled={respond.isPending}
            type="button"
            onClick={() => respond.mutate({ giftId: gift.id, action: 'decline' })}
          >
            Decline
          </button>
        </div>
      )}
    </li>
  );

  const renderSent = (gift: SubscriptionGift) => (
    <li
      key={gift.id}
      className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]"
    >
      <div>
        <div className="font-medium text-white">{tierName(gift.tier)} gift</div>
        <div className="text-xs text-gray-400 mt-1">
          Sent {formatSubscriptionDate(gift.createdAt)}
        </div>
      </div>
      <span className="text-xs text-gray-300">{STATUS_LABELS[gift.status]}</span>
    </li>
  );

  let body: ReactNode;
  if (giftsQuery.isError) {
    body = (
      <ErrorState
        isRetrying={giftsQuery.isRefetching}
        message="We couldn't load your gifts. Try again in a moment."
        title="Failed to load gifts"
        variant="network"
        onRetry={() => void giftsQuery.refetch()}
      />
    );
  } else if (giftsQuery.isLoading) {
    body = (
      <p className="text-sm text-gray-400" role="status">
        Loading gifts…
      </p>
    );
  } else {
    body = (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Received</h3>
          {received.length > 0 ? (
            <ul className="space-y-3">{received.map(renderReceived)}</ul>
          ) : (
            <p className="text-sm text-gray-400">No gifts waiting for you.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Sent</h3>
          {sent.length > 0 ? (
            <ul className="space-y-3">{sent.map(renderSent)}</ul>
          ) : (
            <p className="text-sm text-gray-400">You haven&apos;t sent any gifts yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Gifts</h2>
      {body}
    </section>
  );
}
