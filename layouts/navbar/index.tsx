'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DynamicUserProfile, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Variants, motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import FullScreenLoader from '@/components/common/home/FullScreenLoader';
import { Auth } from '@/hooks/useAuth';

/**
 * True if the visitor has no injected EVM wallet extension at all
 * (e.g. MetaMask, Coinbase Wallet). Dynamic's modal still offers
 * email/social login and WalletConnect in this case, but we surface a
 * friendly hint up front instead of letting them hit a dead end.
 */
function hasInjectedWallet(): boolean {
  if (typeof window === 'undefined') return true;
  return typeof (window as unknown as { ethereum?: unknown }).ethereum !== 'undefined';
}

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Artist Hub', href: '/artist-hub' },
  { name: 'Marketplace', href: '/marketPlace' },
  { name: 'Collective', href: '/collective' },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { setShouldTriggerSignature, loading } = Auth();
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isMenuOpen) {
      mobileCloseRef.current?.focus();
    }
  }, [isMenuOpen]);

  const handleMobileMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMenuOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, []);

  const { setShowAuthFlow } = useDynamicContext();
  const { setShowDynamicUserProfile, user } = useDynamicContext();

  const handleAuthentication = async () => {
    if (!hasInjectedWallet()) {
      toast.error(
        'No wallet extension detected. You can still sign in with email below, or install a wallet like MetaMask.',
        {
          action: {
            label: 'Get MetaMask',
            onClick: () => window.open('https://metamask.io/download/', '_blank'),
          },
          duration: 8000,
        }
      );
    }
    setShouldTriggerSignature(true);
    setShowAuthFlow(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Utility function for active link styling
  const linkClass = (href: string) =>
    pathname === href
      ? 'text-[#6B4C87] px-6 py-2 rounded-full text-sm font-medium bg-transparent bg-opacity-10 border border-[#6B4C87]'
      : 'text-gray-300 hover:text-white px-6 py-2 text-sm font-medium transition-colors duration-200';

  // Variants for animation
  const menuVariants: Variants = {
    hidden: { x: '100%' },
    visible: {
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
        when: 'beforeChildren',
        staggerChildren: 0.1,
      },
    },
    exit: {
      x: '100%',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  return (
    <nav
      className={`w-full z-30 sticky top-0 py-4 transition-all duration-300 ${
        scrolled ? 'bg-[#0f0f0f]/80 backdrop-blur-lg ' : ''
      }`}
    >
      <div className="flex h-[51px] items-center justify-between py-4 max-w-11/12 mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Image alt="AudioBlocks Logo" height={100} src="/logo2.png" width={100} />
          <ThemeToggle />
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex bg-[#0F0F0F] rounded-full border border-gray-800 p-1 items-center justify-between">
          <Link className={linkClass('/')} href="/">
            Home
          </Link>
          <Link className={linkClass('/artist-hub')} href="/artist-hub">
            Artist Hub
          </Link>
          <Link className={linkClass('/marketPlace')} href="/marketPlace">
            Marketplace
          </Link>
          <Link className={linkClass('/collective')} href="/collective">
            Collective
          </Link>
        </div>

        {/* Sign In */}
        <div className="hidden md:flex">
          {!user?.userId ? (
            <button
              className="px-4 cursor-pointer py-2 gap-3 rounded-full bg-[#D2045B] hover:bg-[#B8043F] flex justify-between items-center text-white font-bold transition-all duration-200 whitespace-nowrap text-sm hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={handleAuthentication}
            >
              Sign in
              <div className="bg-black rounded-full p-1">
                <ArrowRight className="h-4 w-4 rotate-[300deg]" />
              </div>
            </button>
          ) : (
            <button
              className="px-4 cursor-pointer py-2 gap-3 rounded-4xl bg-[#D2045B] hover:bg-[#B8043F] flex justify-between items-center text-white font-bold transition-all duration-200 whitespace-nowrap text-sm hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => setShowDynamicUserProfile(true)}
            >
              {user?.email}
            </button>
          )}

          <DynamicUserProfile />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D2045B]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-in Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            animate="visible"
            aria-label="Navigation menu"
            aria-modal="true"
            className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#000] z-50 shadow-lg border-l border-gray-900"
            exit="exit"
            initial="hidden"
            role="dialog"
            variants={menuVariants}
            onKeyDown={handleMobileMenuKeyDown}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <Image alt="AudioBlocks Logo" height={40} src="/logo2.png" width={40} />
              <button
                ref={mobileCloseRef}
                aria-label="Close navigation menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map(({ name, href }) => (
                <motion.div key={href} variants={itemVariants}>
                  <Link
                    className={`block text-base ${linkClass(href)}`}
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {name}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={itemVariants}>
                {!user?.userId ? (
                  <button
                    className="mt-6 w-full px-4 py-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2"
                    onClick={handleAuthentication}
                  >
                    Sign in
                    <div className="bg-black rounded-full p-1">
                      <ArrowRight className="h-4 w-4 rotate-[300deg]" />
                    </div>
                  </button>
                ) : (
                  <button
                    className="mt-6 w-full px-4 py-2 rounded-full bg-[#D2045B] hover:bg-[#B8043F] text-white font-medium text-sm flex justify-center items-center gap-2"
                    onClick={() => setShowDynamicUserProfile(true)}
                  >
                    {user?.email}
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchOverlay />
    </nav>
  );
};

export default Navbar;
