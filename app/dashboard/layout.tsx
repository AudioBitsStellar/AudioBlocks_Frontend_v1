import Sidebar from "@/components/common/dashboard/sidebar";
import TopNavbar from "@/components/common/dashboard/topnavbar";
import Player from "@/components/common/Player";
import { PlaybackProvider } from "@/context/PlaybackContext";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <PlaybackProvider>
      <div className="w-full">
        <Sidebar />

        <div className="flex-1 ml-0 md:ml-45 flex flex-col pb-28">
          <TopNavbar />

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
