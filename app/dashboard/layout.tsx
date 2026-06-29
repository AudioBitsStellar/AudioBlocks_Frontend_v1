'use client';

import { useState } from 'react';
import Sidebar from "@/components/common/dashboard/sidebar";
import TopNavbar from "@/components/common/dashboard/topnavbar";
import Player from "@/components/common/Player";
import { PlaybackProvider } from "@/context/PlaybackContext";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PlaybackProvider>
      <div className="w-full overflow-x-hidden">
        <Sidebar openMobile={mobileOpen} onOpenMobileChange={setMobileOpen} />

        <div className="flex-1 md:ml-45 flex flex-col pb-28 min-w-0">
          <TopNavbar onMenuClick={() => setMobileOpen(true)} />

          <main className="flex-1 px-4 md:px-6 py-4">
            {children}
          </main>

          <Player />
        </div>
      </div>
    </PlaybackProvider>
  );
};

export default DashboardLayout;
