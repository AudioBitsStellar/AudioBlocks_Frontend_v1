'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Check } from 'lucide-react';
import ErrorState from '@/components/common/ErrorState';
import GiftSubscriptionForm from '@/components/subscriptions/GiftSubscriptionForm';
import {
  useCurrentSubscription,
  useStartSubscription,
  useSubscriptionTiers,
} from '@/hooks/useSubscription';
import {
  featureLabel,
  formatMonthlyPrice,
  SUBSCRIPTION_CHECKOUT_ENABLED,
  type SubscriptionTier,
  type SubscriptionTierConfig,
} from '@/lib/subscriptionService';

interface PlanCardProps {
  tier: SubscriptionTierConfig;
  isCurrent: boolean;
  isSignedIn: boolean;
  isPending: boolean;
  onChoose: (tier: SubscriptionTier) => void;
}

function PlanCard({ tier, isCurrent, isSignedIn, isPending, onChoose }: PlanCardProps) {
  const isFree = tier.monthlyPriceCents <= 0;

  let action: ReactNode;
  if (isCurrent) {
    action = (
      <button
        className="w-full px-4 py-2 rounded-lg border border-gray-600 text-sm text-gray-300"
        disabled
        type="button"
      >
        Current plan
      </button>
    );
  } else if (isFree) {
    action = (
      <button
        className="w-full px-4 py-2 rounded-lg border border-gray-600 text-sm text-gray-400"
        disabled
        type="button"
      >
        Included with your account
      </button>
    );
  } else if (!isSignedIn) {
    action = (
      <Link
        className="block w-full text-center px-4 py-2 rounded-lg bg-[#D2045B] hover:bg-[#b0034c] text-sm font-semibold text-white transition-colors"
        href="/login"
      >
        Sign in to subscribe
      </Link>
    );
  } else if (!SUBSCRIPTION_CHECKOUT_ENABLED) {
    action = (
      <button
        className="w-full px-4 py-2 rounded-lg bg-gray-700 text-sm text-gray-300 disabled:opacity-70"
        disabled
        type="button"
      >
        Checkout coming soon
      </button>
    );
  } else {
    action = (
      <button
        className="w-full px-4 py-2 rounded-lg bg-[#D2045B] hover:bg-[#b0034c] text-sm font-semibold text-white transition-colors disabled:opacity-50"
        disabled={isPending}
        type="button"
        onClick={() => onChoose(tier.tier)}
      >
        {isPending ? 'Updating…' : 'Choose plan'}
      </button>
    );
  }

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-[#1E1E1E] p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{tier.displayName}</h2>
        <p className="mt-1 text-2xl font-bold text-white">
          {formatMonthlyPrice(tier.monthlyPriceCents)}
        </p>
      </div>
      <ul className="flex-1 space-y-2 text-sm text-gray-300">
        <li className="flex gap-2">
          <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#D2045B]" />
          {tier.maxUploadsPerMonth === null
            ? 'Unlimited uploads'
            : `${tier.maxUploadsPerMonth} uploads a month`}
        </li>
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#D2045B]" />
            {featureLabel(feature)}
          </li>
        ))}
      </ul>
      {action}
    </li>
  );
}

export default function PlansPage() {
  const { user } = useDynamicContext();
  const isSignedIn = !!user?.userId;
  const tiersQuery = useSubscriptionTiers();
  const currentQuery = useCurrentSubscription(isSignedIn);
  const startMutation = useStartSubscription();
  const currentTier = currentQuery.data?.tier;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Plans</h1>
        <p className="mt-2 text-sm text-gray-400">
          Compare what each plan includes. Premium features show an upgrade prompt when your plan
          doesn&apos;t include them.
        </p>
      </header>

      {!SUBSCRIPTION_CHECKOUT_ENABLED && (
        <p
          className="rounded-lg border border-gray-700 bg-[#1E1E1E] px-4 py-3 text-sm text-gray-300"
          role="note"
        >
          Paid plans are coming soon. You can review what each plan includes now.
        </p>
      )}

      {tiersQuery.isError ? (
        <ErrorState
          isRetrying={tiersQuery.isRefetching}
          message="We couldn't load the plans. Check your connection and try again."
          title="Failed to load plans"
          variant="network"
          onRetry={() => void tiersQuery.refetch()}
        />
      ) : tiersQuery.isLoading ? (
        <p className="text-sm text-gray-400" role="status">
          Loading plans…
        </p>
      ) : (
        <ul aria-label="Subscription plans" className="grid gap-4 md:grid-cols-3">
          {(tiersQuery.data ?? []).map((tier) => (
            <PlanCard
              key={tier.tier}
              isCurrent={tier.tier === currentTier}
              isPending={startMutation.isPending}
              isSignedIn={isSignedIn}
              tier={tier}
              onChoose={(selected) => startMutation.mutate(selected)}
            />
          ))}
        </ul>
      )}

      <section aria-labelledby="gift-heading" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white" id="gift-heading">
            Gift a subscription
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Pick a plan for another listener. They can accept it from their settings.
          </p>
        </div>
        {!isSignedIn ? (
          <p className="text-sm text-gray-400">Sign in to gift a plan to another listener.</p>
        ) : tiersQuery.data ? (
          <GiftSubscriptionForm tiers={tiersQuery.data} />
        ) : null}
      </section>
    </div>
  );
}
