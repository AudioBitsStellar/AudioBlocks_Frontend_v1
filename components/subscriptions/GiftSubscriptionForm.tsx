'use client';

import { useState, type FormEvent } from 'react';
import { useRecipientSearch, useSendGift } from '@/hooks/useGifts';
import type { RecipientCandidate } from '@/lib/giftService';
import type { SubscriptionTier, SubscriptionTierConfig } from '@/lib/subscriptionService';

const MESSAGE_LIMIT = 200;

/**
 * Gifts a paid plan to another user. The recipient is found by username, then
 * a plan and an optional message are chosen (#585). Backend rule violations such
 * as self-gifting are shown with the API's own message.
 */
export default function GiftSubscriptionForm({ tiers }: { tiers: SubscriptionTierConfig[] }) {
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<RecipientCandidate | null>(null);
  const [tier, setTier] = useState<SubscriptionTier | ''>('');
  const [message, setMessage] = useState('');
  const search = useRecipientSearch();
  const sendGift = useSendGift();

  const giftableTiers = tiers.filter((option) => option.tier !== 'free');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecipient(null);
    search.mutate(query);
  };

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient || !tier) return;
    sendGift.mutate(
      { recipientId: recipient.id, tier, message },
      {
        onSuccess: () => {
          setRecipient(null);
          setTier('');
          setMessage('');
          setQuery('');
          search.reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <form className="space-y-3" onSubmit={handleSearch}>
        <label className="block text-sm text-gray-300" htmlFor="gift-recipient-search">
          Find a recipient by username
        </label>
        <div className="flex gap-2">
          <input
            autoComplete="off"
            className="flex-1 rounded-lg border border-gray-700 bg-[#1E1E1E] px-3 py-2 text-sm text-white placeholder:text-gray-500"
            id="gift-recipient-search"
            placeholder="username"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-sm text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
            disabled={!query.trim() || search.isPending}
            type="submit"
          >
            {search.isPending ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {search.isSuccess && search.data.length === 0 && (
        <p className="text-sm text-gray-400" role="status">
          No users match &ldquo;{search.variables}&rdquo;.
        </p>
      )}
      {search.isSuccess && search.data.length > 0 && (
        <ul aria-label="Matching users" className="flex flex-wrap gap-2">
          {search.data.map((user) => (
            <li key={user.id}>
              <button
                aria-pressed={recipient?.id === user.id}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  recipient?.id === user.id
                    ? 'border-[#D2045B] bg-[#D2045B]/10 text-white'
                    : 'border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
                type="button"
                onClick={() => setRecipient(user)}
              >
                @{user.username}
              </button>
            </li>
          ))}
        </ul>
      )}

      {recipient && (
        <form
          className="space-y-4 rounded-lg border border-gray-700 bg-[#1E1E1E] p-4"
          onSubmit={handleSend}
        >
          <p className="text-sm text-gray-300">
            Gift a plan to <span className="font-semibold text-white">@{recipient.username}</span>
          </p>

          <div className="space-y-2">
            <label className="block text-sm text-gray-300" htmlFor="gift-tier">
              Plan
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white"
              id="gift-tier"
              value={tier}
              onChange={(event) => setTier(event.target.value as SubscriptionTier)}
            >
              <option value="">Choose a plan</option>
              {giftableTiers.map((option) => (
                <option key={option.tier} value={option.tier}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-300" htmlFor="gift-message">
              Message (optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white"
              id="gift-message"
              maxLength={MESSAGE_LIMIT}
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <p className="text-right text-xs text-gray-500">
              {message.length}/{MESSAGE_LIMIT}
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-lg bg-[#D2045B] hover:bg-[#b0034c] text-sm font-semibold text-white transition-colors disabled:opacity-50"
            disabled={!tier || sendGift.isPending}
            type="submit"
          >
            {sendGift.isPending ? 'Sending…' : 'Send gift'}
          </button>
        </form>
      )}
    </div>
  );
}
