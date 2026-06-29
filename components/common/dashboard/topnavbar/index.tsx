'use client';

import { FiSearch } from 'react-icons/fi';
import { Bell, Menu } from 'lucide-react';
import UserMenu from './UserMenu';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopNavbarProps {
  onMenuClick?: () => void;
}

const TopNavbar = ({ onMenuClick }: TopNavbarProps) => {
  const isMobile = useIsMobile();

  return (
    <header className="w-full px-4 md:px-8 py-4 shadow-md bg-[#161616] flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="text-white cursor-pointer p-1"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        )}
        <div>
          <h2 className="text-sm md:text-base font-semibold">Welcome, Pete Lisk</h2>
          <p className="text-xs text-gray-400">May 2025 | 11:00 AM GMT</p>
        </div>
      </div>

      <div className="flex-1 mx-4 max-w-2xl hidden md:flex">
        <div className="flex items-center w-full bg-[#1E1E1E] rounded-xl px-4 py-2">
          <FiSearch className="text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Search by artists, songs or albums"
            className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative">
          <Bell className="text-white" size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
};

export default TopNavbar;
