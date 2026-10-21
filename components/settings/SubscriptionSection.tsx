'use client';

import Link from 'next/link';
import ErrorState from '@/components/common/ErrorState';
import {
  useCancelSubscription,
  useCurrentSubscription,
  useSubscriptionTiers,
} from '@/hooks/useSubscription';
import { formatSubscriptionDate, type Subscription } from '@/lib/subscriptionService';

/** Says when the current plan ends: the trial end for a trial, otherwise the period end. */
function periodLabel(subscription: Subscription): string | null {
  const now = Date.now();
  if (subscription.trialEndsAt && new Date(subscription.trialEndsAt).getTime() > now) {
    return `Trial ends ${formatSubscriptionDate(subscription.trialEndsAt)}`;
  }
  if (subscription.endDate) {
    return `Current period ends ${formatSubscriptionDate(subscription.endDate)}`;
  }
  return null;
}

/** Current plan, its renewal or trial end date, and a cancel action (#584). */
export default function SubscriptionSection() {
  const currentQuery = useCurrentSubscription();
  const tiersQuery = useSubscriptionTiers();
  const cancelMutation = useCancelSubscription();

  const subscription = currentQuery.data?.subscription ?? null;
  const tierId = currentQuery.data?.tier ?? 'free';
  const tierName = tiersQuery.data?.find((tier) => tier.tier === tierId)?.displayName ?? tierId;
  const isActive = subscription?.status === 'active';

  const handleCancel = () => {
    if (!window.confirm('Cancel your subscription? Access stays until the end date.')) return;
    cancelMutation.mutate();
  };

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>

      {currentQuery.isError ? (
        <ErrorState
          isRetrying={currentQuery.isRefetching}
          message="We couldn't load your plan. Try again in a moment."
          title="Failed to load your plan"
          variant="network"
          onRetry={() => void currentQuery.refetch()}
        />
      ) : currentQuery.isLoading ? (
        <p className="text-sm text-gray-400" role="status">
          Loading your plan…
        </p>
      ) : (
        <div className="p-4 rounded-lg border border-gray-700 bg-[#1E1E1E] space-y-2">
          <div className="font-medium text-white">
            Current plan: <span data-testid="current-tier">{tierName}</span>
          </div>
          {subscription ? (
            <>
              <div className="text-xs text-gray-400 capitalize">
                Status: {subscription.status}
              </div>
              {periodLabel(subscription) && (
                <div className="text-xs text-gray-400">{periodLabel(subscription)}</div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-400">You are on the free plan.</div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D2045B] hover:bg-[#b0034c] rounded-lg transition-colors"
              href="/plans"
            >
              View plans
            </Link>
            {isActive && (
              <button
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={cancelMutation.isPending}
                type="button"
                onClick={handleCancel}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
