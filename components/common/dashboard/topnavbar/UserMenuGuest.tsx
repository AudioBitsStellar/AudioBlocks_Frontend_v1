'use client';

import Link from 'next/link';
import { FiLogIn, FiUser } from 'react-icons/fi';

interface UserMenuGuestProps {
  onClose: () => void;
}

export function UserMenuGuest({ onClose }: UserMenuGuestProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6">
      <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center">
        <FiUser className="text-[#A3A3A3]" size={28} />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold mb-1">Welcome</p>
        <p className="text-xs text-[#A3A3A3]">Connect your wallet to access your dashboard</p>
      </div>
      <Link
        className="flex items-center gap-2 bg-[#D2045B] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#b80348] transition cursor-pointer"
        href="/"
        onClick={onClose}
      >
        <FiLogIn />
        <span>Connect Wallet</span>
      </Link>
    </div>
  );
}
