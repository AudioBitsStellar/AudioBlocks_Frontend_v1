'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  useCommunityActivity,
  type CommunityActivity,
  type CommunityEvent,
} from '@/hooks/useCommunityActivity';

export interface CommunityContextValue {
  communityId: string | null;
  activity: CommunityActivity | null;
  memberCount: number;
  onlineCount: number;
  recentEvents: CommunityEvent[];
  lastUpdated: number | null;
  isLoading: boolean;
  isOnline: boolean;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

export interface CommunityProviderProps {
  children: ReactNode;
  communityId?: string | null;
}

export function CommunityProvider({ children, communityId = null }: CommunityProviderProps) {
  const activity = useCommunityActivity(communityId);

  const value = useMemo<CommunityContextValue>(() => {
    return {
      communityId: communityId ?? null,
      activity,
      memberCount: activity?.memberCount ?? 0,
      onlineCount: activity?.onlineCount ?? 0,
      recentEvents: activity?.recentEvents ?? [],
      lastUpdated: activity?.lastUpdated ?? null,
      isLoading: !!communityId && !activity,
      isOnline: (activity?.onlineCount ?? 0) > 0,
    };
  }, [communityId, activity]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunityContext(): CommunityContextValue {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunityContext must be used within a CommunityProvider');
  }
  return context;
}

/**
 * Online member count component with green status indicator (#125).
 */
export function OnlineMemberIndicator({
  onlineCount,
  className = '',
}: {
  onlineCount?: number;
  className?: string;
}) {
  const context = useContext(CommunityContext);
  const count = onlineCount ?? context?.onlineCount ?? 0;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className}`}>
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"
      />
      <span className="font-medium text-emerald-400">{count} online</span>
    </div>
  );
}

/**
 * Activity feed preview component showing the last 5 community events (#125).
 */
export function ActivityFeedPreview({
  events,
  className = '',
}: {
  events?: CommunityEvent[];
  className?: string;
}) {
  const context = useContext(CommunityContext);
  const eventList = events ?? context?.recentEvents ?? [];

  if (eventList.length === 0) {
    return <p className={`text-xs text-gray-500 italic ${className}`}>No recent activity</p>;
  }

  return (
    <ul className={`space-y-2 text-xs text-gray-300 ${className}`} role="list">
      {eventList.slice(0, 5).map((event) => (
        <li key={event.id} className="flex items-center justify-between gap-2">
          <span className="truncate">{event.description}</span>
          <span className="text-gray-500 shrink-0">
            {new Date(event.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export { CommunityContext };
