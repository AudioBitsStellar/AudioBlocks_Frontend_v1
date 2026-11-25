'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PROFILE_QUERY_KEY, useGetProfile } from '@/hooks/useProfile';
import {
  listGiftSubscriptions,
  listGiftTiers,
  respondToGift,
  searchGiftArtists,
  sendGiftSubscription,
  type GiftArtist,
} from '@/lib/giftSubscriptionService';

function artistLabel(artist: GiftArtist): string {
  return artist.username ? `@${artist.username}` : artist.name || artist.id;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

export function GiftSubscriptionsSection() {
  const queryClient = useQueryClient();
  const profile = useGetProfile();
  const [username, setUsername] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<GiftArtist | null>(null);
  const [tier, setTier] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const initialTier = new URLSearchParams(window.location.search).get('giftTier');
    if (initialTier) setTier(initialTier);
  }, []);
  const gifts = useQuery({ queryKey: ['subscription-gifts'], queryFn: listGiftSubscriptions });
  const tiers = useQuery({ queryKey: ['subscription-gift-tiers'], queryFn: listGiftTiers });
  const artists = useQuery({ queryKey: ['subscription-gift-artists'], queryFn: searchGiftArtists });
  const matches = useMemo(() => {
    const term = username.trim().replace(/^@/, '').toLowerCase();
    if (term.length < 2 || selectedArtist) return [];
    return (artists.data ?? [])
      .filter((artist) => (artist.username ?? '').toLowerCase().includes(term))
      .slice(0, 6);
  }, [artists.data, selectedArtist, username]);

  const send = useMutation({
    mutationFn: sendGiftSubscription,
    onSuccess: async () => {
      setUsername('');
      setSelectedArtist(null);
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['subscription-gifts'] });
    },
  });
  const respond = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) =>
      respondToGift(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscription-gifts'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });

  const received = (gifts.data ?? []).filter(
    (gift) => gift.recipientId === profile.data?.id && gift.status === 'pending'
  );
  const sent = (gifts.data ?? []).filter((gift) => gift.senderId === profile.data?.id);

  return (
    <section className="mb-10 scroll-mt-8" id="gifts">
      <h2 className="mb-4 text-lg font-semibold text-white">Gifts</h2>
      <p className="mb-4 text-sm text-gray-400">
        Send a subscription to an artist, or accept and manage gifts sent to you.
      </p>

      <form
        className="mb-6 space-y-3 rounded-lg border border-gray-700 bg-[#1E1E1E] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedArtist && tier) {
            send.mutate({
              recipientId: selectedArtist.id,
              tier,
              message: message.trim() || undefined,
            });
          }
        }}
      >
        <h3 className="font-medium text-white">Send a gift</h3>
        <label className="block text-sm text-gray-300" htmlFor="gift-recipient-search">
          Find an artist by username
        </label>
        <input
          autoComplete="off"
          className="w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white"
          id="gift-recipient-search"
          placeholder="Search username"
          value={selectedArtist ? artistLabel(selectedArtist) : username}
          onChange={(event) => {
            setSelectedArtist(null);
            setUsername(event.target.value);
          }}
        />
        {matches.length > 0 && (
          <ul
            aria-label="Artist search results"
            className="divide-y divide-gray-700 rounded-lg border border-gray-700"
          >
            {matches.map((artist) => (
              <li key={artist.id}>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                  type="button"
                  onClick={() => {
                    setSelectedArtist(artist);
                    setUsername('');
                  }}
                >
                  {artistLabel(artist)}
                  {artist.name ? ` · ${artist.name}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
        {username.trim().length >= 2 &&
          !artists.isPending &&
          matches.length === 0 &&
          !selectedArtist && (
            <p className="text-xs text-gray-400">No matching artist usernames found.</p>
          )}
        <label className="block text-sm text-gray-300" htmlFor="gift-tier">
          Subscription tier
        </label>
        <select
          className="w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white"
          id="gift-tier"
          value={tier}
          onChange={(event) => setTier(event.target.value)}
        >
          <option value="">Choose a tier</option>
          {(tiers.data ?? []).map((option) => (
            <option key={option.tier} value={option.tier}>
              {option.displayName}
            </option>
          ))}
        </select>
        <label className="block text-sm text-gray-300" htmlFor="gift-message">
          Optional message
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white"
          id="gift-message"
          maxLength={500}
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {send.isError && (
          <p className="text-sm text-red-400" role="alert">
            {errorText(send.error)}
          </p>
        )}
        {send.isSuccess && (
          <p className="text-sm text-green-400" role="status">
            Gift sent.
          </p>
        )}
        <button
          className="rounded-lg bg-[#D2045B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!selectedArtist || !tier || send.isPending}
          type="submit"
        >
          {send.isPending ? 'Sending…' : 'Send gift'}
        </button>
      </form>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-medium text-white">Received gifts</h3>
          {gifts.isPending ? <p className="text-sm text-gray-400">Loading gifts…</p> : null}
          {gifts.isError && (
            <p className="text-sm text-red-400" role="alert">
              Could not load gifts. {errorText(gifts.error)}
            </p>
          )}
          {!gifts.isPending && !gifts.isError && received.length === 0 && (
            <p className="text-sm text-gray-400">No pending gifts.</p>
          )}
          {received.map((gift) => (
            <div key={gift.id} className="mb-2 rounded-lg border border-gray-700 bg-[#1E1E1E] p-4">
              <p className="text-sm text-white">
                {gift.tier} subscription from {gift.senderId}
              </p>
              {gift.message && <p className="mt-1 text-sm text-gray-300">{gift.message}</p>}
              {gift.expiresAt && (
                <p className="mt-1 text-xs text-gray-400">
                  Expires {new Date(gift.expiresAt).toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded border border-gray-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={respond.isPending}
                  type="button"
                  onClick={() => respond.mutate({ id: gift.id, action: 'accept' })}
                >
                  Accept
                </button>
                <button
                  className="rounded border border-gray-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={respond.isPending}
                  type="button"
                  onClick={() => respond.mutate({ id: gift.id, action: 'decline' })}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {respond.isError && (
            <p className="text-sm text-red-400" role="alert">
              {errorText(respond.error)}
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-medium text-white">Sent gifts</h3>
          {sent.length === 0 ? (
            <p className="text-sm text-gray-400">No sent gifts.</p>
          ) : (
            <ul className="divide-y divide-gray-700 rounded-lg border border-gray-700">
              {sent.map((gift) => (
                <li
                  key={gift.id}
                  className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="text-gray-200">
                    {gift.tier} · recipient {gift.recipientId}
                  </span>
                  <span className="capitalize text-gray-400">{gift.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
