'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from "@/components/common/dashboard/sidebar";
import TopNavbar from "@/components/common/dashboard/topnavbar";
import { QueueDrawer } from "@/components/common/QueueDrawer";
import { PlaybackProvider } from "@/context/PlaybackContext";
import { useEdgeSwipe } from "@/hooks/useEdgeSwipe";

// Player reads/writes browser-only audio APIs (HTMLAudioElement, localStorage-backed
// playback state); rendering it only on the client avoids server/client markup drift.
const Player = dynamic(() => import("@/components/common/Player"), { ssr: false });

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const openQueue = useCallback(() => setQueueOpen(true), []);
  useEdgeSwipe({ onSwipeFromRightEdge: openQueue });

  return (
    <PlaybackProvider>
      <div className="w-full overflow-x-hidden touch-pan-y">
        <Sidebar openMobile={mobileOpen} onOpenMobileChange={setMobileOpen} />

        <div className="flex-1 md:ml-45 flex flex-col pb-28 min-w-0">
          <TopNavbar onMenuClick={() => setMobileOpen(true)} />

          <main className="flex-1 px-4 md:px-6 py-4">
            {children}
          </main>

          <Player />
        </div>

        <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      </div>
    </PlaybackProvider>
  );
};

export default DashboardLayout;
