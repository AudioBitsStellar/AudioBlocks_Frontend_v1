'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import OnboardingRedirect from '@/components/auth/OnboardingRedirect';
import Sidebar from '@/components/common/dashboard/sidebar';
import TopNavbar from '@/components/common/dashboard/topnavbar';
import { QueueDrawer } from '@/components/common/QueueDrawer';
import { PageTransition } from '@/components/ui/PageTransition';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

const Player = dynamic(() => import('@/components/common/Player'), { ssr: false });

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const openQueue = useCallback(() => setQueueOpen(true), []);
  useEdgeSwipe({ onSwipeFromRightEdge: openQueue });

  return (
    <PlaybackProvider>
      <div className="w-full overflow-x-hidden touch-pan-y">
        <OnboardingRedirect />
        <Sidebar openMobile={mobileOpen} onOpenMobileChange={setMobileOpen} />

        <div className="flex-1 md:ml-45 flex flex-col pb-28 min-w-0">
          <TopNavbar onMenuClick={() => setMobileOpen(true)} />

          <main className="flex-1 px-4 md:px-6 py-4">
            <PageTransition>{children}</PageTransition>
          </main>

          <Player />
        </div>

        <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      </div>
    </PlaybackProvider>
  );
}
