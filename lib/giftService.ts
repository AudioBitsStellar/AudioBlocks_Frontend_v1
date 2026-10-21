import apiClient from './apiClient';
import { ApiShapeError } from './api/unwrap';
import { API_ENDPOINTS } from './constants';
import type { SubscriptionTier } from './subscriptionService';

export type GiftStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/** A row of `gift_subscriptions`, returned by the gift routes (#585). */
export interface SubscriptionGift {
  id: string;
  senderId: string;
  recipientId: string;
  tier: SubscriptionTier;
  durationDays: number | null;
  message: string | null;
  status: GiftStatus;
  expiresAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

export interface SendGiftInput {
  recipientId: string;
  tier: SubscriptionTier;
  message?: string;
}

export interface RecipientCandidate {
  id: string;
  username: string;
  name?: string | null;
}

/** POST /api/subscriptions/gift → `{ gift }`. Rule violations come back with a message. */
export async function sendSubscriptionGift(input: SendGiftInput): Promise<SubscriptionGift> {
  const res = await apiClient.post(API_ENDPOINTS.SUBSCRIPTION_GIFT, {
    recipientId: input.recipientId,
    tier: input.tier,
    message: input.message?.trim() || undefined,
  });
  return res.data?.gift as SubscriptionGift;
}

/** GET /api/subscriptions/gifts → `{ gifts }`, both sent and received. */
export async function listSubscriptionGifts(): Promise<SubscriptionGift[]> {
  const res = await apiClient.get(API_ENDPOINTS.SUBSCRIPTION_GIFTS);
  if (!Array.isArray(res.data?.gifts)) throw new ApiShapeError('expected "gifts" array', res);
  return res.data.gifts as SubscriptionGift[];
}

/** POST /api/subscriptions/gift/:id/accept|decline. Accepting activates the recipient's tier. */
export async function respondToGift(giftId: string, action: 'accept' | 'decline') {
  const res = await apiClient.post(API_ENDPOINTS.SUBSCRIPTION_GIFT_ACTION(giftId, action));
  return res.data as { gift: SubscriptionGift };
}

/**
 * Finds users whose username contains `query`. The backend has no username search, so this
 * filters GET /api/users on the client. Swap in a search route when the backend adds one.
 */
export async function searchUsersByUsername(query: string): Promise<RecipientCandidate[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const res = await apiClient.get(API_ENDPOINTS.USERS);
  if (!Array.isArray(res.data)) throw new ApiShapeError('expected a list of users', res);
  const matches = (res.data as RecipientCandidate[]).filter(
    (user) => typeof user.username === 'string' && user.username.toLowerCase().includes(term)
  );
  return matches.slice(0, 8);
}
