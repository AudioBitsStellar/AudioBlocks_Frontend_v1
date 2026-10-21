import apiClient from './apiClient';
import { ApiShapeError } from './api/unwrap';
import { API_ENDPOINTS } from './constants';

/**
 * Paid checkout is off until the backend collects payment. `POST /api/subscriptions`
 * activates a tier without one, so the plans page keeps checkout disabled (#584).
 */
export const SUBSCRIPTION_CHECKOUT_ENABLED =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_CHECKOUT === 'enabled';

export type SubscriptionTier = 'free' | 'artist_pro' | 'label';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

/** One row of `subscription_tier_configs`, as returned by GET /api/subscriptions/tiers. */
export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  displayName: string;
  /** USD cents per month. 0 means free. */
  monthlyPriceCents: number;
  annualPriceCents: number | null;
  /** Feature keys such as `unlimited_uploads`. */
  features: string[];
  /** null means unlimited. */
  maxUploadsPerMonth: number | null;
  hidden: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  trialEndsAt: string | null;
}

export interface CurrentSubscription {
  tier: SubscriptionTier;
  /** null when the user has never subscribed and is on the free tier. */
  subscription: Subscription | null;
}

/** GET /api/subscriptions/tiers → `{ tiers }`. Hidden tiers are left out. */
export async function fetchSubscriptionTiers(): Promise<SubscriptionTierConfig[]> {
  const res = await apiClient.get(API_ENDPOINTS.SUBSCRIPTION_TIERS);
  if (!Array.isArray(res.data?.tiers)) throw new ApiShapeError('expected "tiers" array', res);
  const tiers = res.data.tiers as SubscriptionTierConfig[];
  return tiers.filter((tier) => !tier.hidden).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** GET /api/subscriptions/me/subscription → `{ subscription, tier }`. */
export async function fetchCurrentSubscription(): Promise<CurrentSubscription> {
  const res = await apiClient.get(API_ENDPOINTS.SUBSCRIPTION_CURRENT);
  return {
    tier: (res.data?.tier as SubscriptionTier) ?? 'free',
    subscription: (res.data?.subscription as Subscription | null) ?? null,
  };
}

/** POST /api/subscriptions → `{ subscription }`. Only reachable while checkout is enabled. */
export async function startSubscription(tier: SubscriptionTier): Promise<Subscription> {
  const res = await apiClient.post(API_ENDPOINTS.SUBSCRIPTIONS, { tier });
  return res.data?.subscription as Subscription;
}

/** DELETE /api/subscriptions → `{ subscription }`. Access stays until the end date. */
export async function cancelSubscription(): Promise<Subscription> {
  const res = await apiClient.delete(API_ENDPOINTS.SUBSCRIPTIONS);
  return res.data?.subscription as Subscription;
}

const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatMonthlyPrice(cents: number): string {
  if (cents <= 0) return 'Free';
  return `${usdFormat.format(cents / 100)}/month`;
}

/** Turns a feature key such as `unlimited_uploads` into a readable label. */
export function featureLabel(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatSubscriptionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
