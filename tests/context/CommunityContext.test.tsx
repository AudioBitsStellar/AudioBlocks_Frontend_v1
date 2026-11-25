import { render, screen, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CommunityProvider,
  useCommunityContext,
  OnlineMemberIndicator,
  ActivityFeedPreview,
} from '@/context/CommunityContext';
import * as activityHook from '@/hooks/useCommunityActivity';

describe('CommunityContext (#125)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if useCommunityContext is used outside CommunityProvider', () => {
    expect(() => {
      renderHook(() => useCommunityContext());
    }).toThrow('useCommunityContext must be used within a CommunityProvider');
  });

  it('provides default values when no communityId is supplied', () => {
    const { result } = renderHook(() => useCommunityContext(), {
      wrapper: ({ children }) => <CommunityProvider>{children}</CommunityProvider>,
    });

    expect(result.current.communityId).toBeNull();
    expect(result.current.memberCount).toBe(0);
    expect(result.current.onlineCount).toBe(0);
    expect(result.current.recentEvents).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOnline).toBe(false);
  });

  it('provides community activity from hook when communityId is set', () => {
    vi.spyOn(activityHook, 'useCommunityActivity').mockReturnValue({
      communityId: 'comm-1',
      memberCount: 42,
      onlineCount: 7,
      recentEvents: [
        { id: 'e1', type: 'join', description: 'User joined', timestamp: 1700000000000 },
      ],
      lastUpdated: 1700000000000,
    });

    const { result } = renderHook(() => useCommunityContext(), {
      wrapper: ({ children }) => (
        <CommunityProvider communityId="comm-1">{children}</CommunityProvider>
      ),
    });

    expect(result.current.communityId).toBe('comm-1');
    expect(result.current.memberCount).toBe(42);
    expect(result.current.onlineCount).toBe(7);
    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.isOnline).toBe(true);
  });

  describe('OnlineMemberIndicator', () => {
    it('renders the online count with green indicator', () => {
      render(
        <CommunityProvider communityId="comm-1">
          <OnlineMemberIndicator onlineCount={5} />
        </CommunityProvider>
      );

      expect(screen.getByText('5 online')).toBeInTheDocument();
    });
  });

  describe('ActivityFeedPreview', () => {
    it('renders empty message when no events exist', () => {
      render(<ActivityFeedPreview events={[]} />);
      expect(screen.getByText(/No recent activity/i)).toBeInTheDocument();
    });

    it('renders list of events up to 5', () => {
      const events: activityHook.CommunityEvent[] = [
        { id: '1', type: 'join', description: 'Alice joined', timestamp: Date.now() },
        { id: '2', type: 'post', description: 'Bob posted a track', timestamp: Date.now() },
      ];

      render(<ActivityFeedPreview events={events} />);

      expect(screen.getByText('Alice joined')).toBeInTheDocument();
      expect(screen.getByText('Bob posted a track')).toBeInTheDocument();
    });
  });
});
