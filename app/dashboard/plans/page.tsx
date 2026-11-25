'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listGiftTiers } from '@/lib/giftSubscriptionService';

export default function PlansPage() {
  const tiers = useQuery({ queryKey: ['subscription-gift-tiers'], queryFn: listGiftTiers });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-white">
      <h1 className="mb-2 text-3xl font-bold">Subscription plans</h1>
      <p className="mb-8 text-sm text-gray-400">
        Choose a plan or gift a subscription to an artist.
      </p>
      {tiers.isPending && <p role="status">Loading plans…</p>}
      {tiers.isError && (
        <p className="text-sm text-red-400" role="alert">
          Plans could not be loaded. Please try again.
        </p>
      )}
      {!tiers.isPending && !tiers.isError && tiers.data?.length === 0 && (
        <p className="text-sm text-gray-400">No plans are currently available.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tiers.data ?? []).map((tier) => (
          <article key={tier.tier} className="rounded-xl border border-gray-700 bg-[#1E1E1E] p-5">
            <h2 className="text-xl font-semibold">{tier.displayName}</h2>
            <p className="mt-2 text-2xl font-bold">
              {tier.monthlyPriceCents === 0
                ? 'Free'
                : `$${(tier.monthlyPriceCents / 100).toFixed(2)}/month`}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link
              className="mt-6 inline-flex rounded-full bg-[#D2045B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b0034c]"
              href={`/dashboard/settings?giftTier=${encodeURIComponent(tier.tier)}#gifts`}
            >
              Gift this plan
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
