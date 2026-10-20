import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError, apiErrorMessage } from '@/lib/apiClient';
import {
  isPremiumRequiredResponse,
  notifyPremiumRequired,
  PREMIUM_REQUIRED_EVENT,
} from '@/lib/subscriptionUpsell';

describe('isPremiumRequiredResponse (#584)', () => {
  it('treats 402 as a premium gate', () => {
    expect(isPremiumRequiredResponse(402)).toBe(true);
  });

  it('treats 403 as a premium gate only when the message asks for an upgrade', () => {
    expect(
      isPremiumRequiredResponse(
        403,
        'This feature requires artist_pro tier or higher. Please upgrade your subscription.'
      )
    ).toBe(true);
    expect(isPremiumRequiredResponse(403, 'You do not own this song.')).toBe(false);
    expect(isPremiumRequiredResponse(403)).toBe(false);
  });

  it('ignores other statuses', () => {
    expect(isPremiumRequiredResponse(401, 'upgrade')).toBe(false);
    expect(isPremiumRequiredResponse(500, 'subscription')).toBe(false);
  });
});

describe('notifyPremiumRequired (#584)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches the premium event with the server message', () => {
    const listener = vi.fn();
    window.addEventListener(PREMIUM_REQUIRED_EVENT, listener);

    notifyPremiumRequired('Please upgrade your subscription.');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<{ message?: string }>;
    expect(event.detail.message).toBe('Please upgrade your subscription.');
    window.removeEventListener(PREMIUM_REQUIRED_EVENT, listener);
  });
});

describe('apiErrorMessage (#584, #585)', () => {
  it('prefers the message the API sent', () => {
    const error = new ApiError(
      'HTTP error! status: 400',
      400,
      'Cannot gift a subscription to yourself'
    );
    expect(apiErrorMessage(error, 'Could not send the gift.')).toBe(
      'Cannot gift a subscription to yourself'
    );
  });

  it('falls back when there is no API message or the error is not an ApiError', () => {
    expect(apiErrorMessage(new ApiError('HTTP error! status: 500', 500), 'Fallback')).toBe(
      'Fallback'
    );
    expect(apiErrorMessage(new Error('network'), 'Fallback')).toBe('Fallback');
  });
});
