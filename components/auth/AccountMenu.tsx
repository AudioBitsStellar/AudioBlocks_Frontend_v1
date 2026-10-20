'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Folder, LogOut, User } from 'lucide-react';

interface AccountMenuProps {
  email?: string;
  initial: string;
  isOpen: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
  onOpenChange: (open: boolean) => void;
  variant: 'desktop' | 'mobile';
}

const AccountMenu = ({
  email,
  initial,
  isOpen,
  onLogout,
  onNavigate,
  onOpenChange,
  variant,
}: AccountMenuProps) => {
  const isMobile = variant === 'mobile';

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Account menu"
          className={
            isMobile
              ? 'mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#D2045B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B8043F]'
              : 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#D2045B] text-sm font-bold text-white transition-all duration-200 hover:scale-105'
          }
          type="button"
        >
          {isMobile ? (
            <>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold">
                {initial}
              </span>
              <span className="max-w-[180px] truncate">{email}</span>
            </>
          ) : (
            initial
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={isMobile ? 'start' : 'end'}
          aria-label="Account menu"
          className={`z-[60] min-w-[240px] rounded-xl border border-gray-800 bg-[#0F0F0F] p-2 text-sm shadow-xl ${isMobile ? 'mt-2' : ''}`}
          sideOffset={8}
          onKeyDown={(event) => {
            if (event.key === 'Tab') onOpenChange(false);
          }}
        >
          {!isMobile && (
            <DropdownMenu.Label className="mb-2 truncate border-b border-gray-800 px-3 pb-3 pt-1 font-semibold text-white">
              {email}
            </DropdownMenu.Label>
          )}
          <DropdownMenu.Item asChild onSelect={onNavigate}>
            <Link
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-gray-300 outline-none transition-colors hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
              href="/dashboard/profile"
            >
              <User aria-hidden="true" className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild onSelect={onNavigate}>
            <Link
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-gray-300 outline-none transition-colors hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
              href="/dashboard/collection"
            >
              <Folder aria-hidden="true" className="h-4 w-4" />
              My Collections
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild onSelect={onLogout}>
            <button
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-gray-300 outline-none transition-colors hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Log out
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default AccountMenu;
