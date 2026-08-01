'use client';

import { Bell, Menu } from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import { useIsMobile } from '@/hooks/use-mobile';
import UserMenu from './UserMenu';

interface TopNavbarProps {
  onMenuClick?: () => void;
}

const TopNavbar = ({ onMenuClick }: TopNavbarProps) => {
  const isMobile = useIsMobile();

  return (
    <header className="w-full px-4 md:px-8 py-4 shadow-md bg-[#161616] flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            aria-label="Open navigation menu"
            className="text-white cursor-pointer shrink-0 w-11 h-11 flex items-center justify-center -ml-2"
            onClick={onMenuClick}
          >
            <Menu size={22} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-semibold truncate">Welcome, Pete Lisk</h2>
          <p className="text-xs text-gray-400 truncate">May 2025 | 11:00 AM GMT</p>
        </div>
      </div>

      <div className="flex-1 mx-4 max-w-2xl hidden md:flex">
        <div className="flex items-center w-full bg-[#1E1E1E] rounded-xl px-4 py-2">
          <FiSearch className="text-gray-400 text-lg" />
          <input
            aria-label="Search by artists, songs or albums"
            className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-gray-400"
            placeholder="Search by artists, songs or albums"
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Notifications"
          className="relative w-11 h-11 flex items-center justify-center"
        >
          <Bell className="text-white" size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
};

export default TopNavbar;
