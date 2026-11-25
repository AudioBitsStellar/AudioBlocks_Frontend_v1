'use client';

// #125 — useCommunityActivity: polls member count and recent activity for a
// community, pausing when the tab is hidden and caching results per community.

import { useEffect, useRef, useState } from 'react';
import { unwrap } from '@/lib/api/unwrap';
import apiClient from '@/lib/apiClient';

export interface CommunityActivity {
  communityId: string;
  memberCount: number;
  onlineCount: number;
  recentEvents: CommunityEvent[];
  lastUpdated: number;
}

export interface CommunityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: number;
}

const POLL_INTERVAL_MS = 60_000;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_EVENTS = 5;

// Module-level cache so multiple hook instances share data.
const activityCache = new Map<string, CommunityActivity>();
const etagCache = new Map<string, string>();

export function clearCommunityActivityCache() {
  activityCache.clear();
  etagCache.clear();
}

async function fetchCommunityActivity(communityId: string): Promise<CommunityActivity> {
  const cached = activityCache.get(communityId);
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL_MS) return cached;

  try {
    const cachedEtag = etagCache.get(communityId);
    const config = cachedEtag ? { headers: { 'If-None-Match': cachedEtag } } : undefined;
    const res = config
      ? await apiClient.get(`/api/community/${communityId}/activity`, config)
      : await apiClient.get(`/api/community/${communityId}/activity`);

    if (res.status === 304 && cached) {
      return cached;
    }

    const etag =
      typeof res.headers?.get === 'function'
        ? res.headers.get('etag')
        : (res.headers as Record<string, string> | undefined)?.etag;
    if (etag) etagCache.set(communityId, etag);

    let data: Partial<CommunityActivity>;
    try {
      data = unwrap<Partial<CommunityActivity>>(res);
    } catch {
      data = (res?.data as Partial<CommunityActivity>) ?? {};
    }
    const activity: CommunityActivity = {
      communityId,
      memberCount: data.memberCount ?? 0,
      onlineCount: data.onlineCount ?? 0,
      recentEvents: (data.recentEvents ?? []).slice(0, MAX_EVENTS),
      lastUpdated: Date.now(),
    };
    activityCache.set(communityId, activity);
    return activity;
  } catch {
    // Return cached stale data on failure rather than crashing
    if (cached) return cached;
    return {
      communityId,
      memberCount: 0,
      onlineCount: 0,
      recentEvents: [],
      lastUpdated: Date.now(),
    };
  }
}

export function useCommunityActivity(communityId: string | null | undefined) {
  const [activity, setActivity] = useState<CommunityActivity | null>(
    communityId ? (activityCache.get(communityId) ?? null) : null
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!communityId) return;

    let cancelled = false;

    const poll = async () => {
      if (document.hidden) return;
      const result = await fetchCommunityActivity(communityId);
      if (!cancelled) setActivity(result);
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Pause polling when tab hidden, resume on visibility change
    const handleVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [communityId]);

  return activity;
}
