'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { FaWallet } from 'react-icons/fa';
import { FiFolder, FiRepeat, FiUser, FiX } from 'react-icons/fi';
import { UserMenuGuest } from '@/components/common/dashboard/topnavbar/UserMenuGuest';
import { UserMenuWallet } from '@/components/common/dashboard/topnavbar/UserMenuWallet';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { Auth } from '@/hooks/useAuth';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const { user } = useDynamicContext();
  const { handleLogOut } = Auth();
  const route = useRouter();
  const pathname = usePathname();
  const isAuthenticated = !!user;
  const { publicKey, connect, disconnect, isConnecting } = useStellarWallet();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      toggleRef.current?.focus();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const [first, last] = [focusable[0], focusable[focusable.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const logOut = () => {
    Cookies.remove('audioblocks_jwt');
    handleLogOut();
    route.push('/');
  };

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        ref={toggleRef}
        aria-label="Open user menu"
        className="w-8 h-8 rounded-full overflow-hidden border border-gray-700 cursor-pointer"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Image
          alt="User"
          className="object-cover w-full h-full"
          height={40}
          src="/tech.jpg"
          width={40}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ x: 0 }}
            aria-label="User menu"
            aria-modal="true"
            className="fixed top-0 right-0 w-60 h-screen bg-[#111111] shadow-lg border-l border-[#2B2B2B] px-5 py-6 flex flex-col"
            exit={{ x: '100%' }}
            initial={{ x: '100%' }}
            role="dialog"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onKeyDown={handlePanelKeyDown}
          >
            <button
              ref={closeButtonRef}
              aria-label="Close user menu"
              className="text-[#A3A3A3] cursor-pointer hover:text-white absolute top-4 right-4"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              <FiX size={22} />
            </button>

            {isAuthenticated ? (
              <>
                <div className="flex items-center truncate border-b pb-3 gap-3 mb-8 mt-2">
                  <Image
                    alt="User Avatar"
                    className="rounded-full"
                    height={50}
                    src="/tech.jpg"
                    width={50}
                  />
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {((user as unknown as Record<string, unknown>)?.name as string) ||
                        user?.email?.split('@')[0] ||
                        'User'}
                    </p>
                    <p className="text-xs overflow-hidden text-ellipsis text-[#A3A3A3]">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-6 text-sm text-[#A3A3A3] font-semibold">
                  <Link
                    className="flex items-center gap-3 cursor-pointer hover:text-[#666C6C] transition"
                    href="/dashboard/profile"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiUser />
                    <span>Profile</span>
                  </Link>
                  <Link
                    className="flex items-center gap-3 cursor-pointer hover:text-[#666C6C] transition"
                    href="#"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiRepeat />
                    <span>Swap</span>
                  </Link>
                  <Link
                    className="flex items-center gap-3 cursor-pointer hover:text-[#666C6C] transition"
                    href="/dashboard/collection"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiFolder />
                    <span>My Collections</span>
                  </Link>

                  <UserMenuWallet
                    isConnecting={isConnecting}
                    publicKey={publicKey}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />

                  <div className="flex items-center gap-3 text-gray-400 mt-8">
                    <FaWallet />
                    <span>Balance:</span>
                    <span className="font-medium text-[#666C6C]">11000 ABT</span>
                  </div>
                  <button
                    className="cursor-pointer hover:text-[#666C6C] transition"
                    type="button"
                    onClick={logOut}
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <UserMenuGuest onClose={() => setIsOpen(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
