'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, ListPlus, Heart, Share2, User } from 'lucide-react';

export interface Track {
  id: string | number;
  title: string;
  artist?: string;
  artistId?: string | number;
  album?: string;
  coverUrl?: string;
  [key: string]: unknown;
}

export interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
  onPlayNext?: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  onSaveToCollection?: (track: Track) => void;
  onShare?: (track: Track) => void;
  onViewArtist?: (track: Track) => void;
  className?: string;
  disabled?: boolean;
}

export function TrackContextMenu({
  children,
  track,
  onPlayNext,
  onAddToQueue,
  onSaveToCollection,
  onShare,
  onViewArtist,
  className = '',
  disabled = false,
}: TrackContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const menuItems = [
    {
      id: 'play-next',
      label: 'Play Next',
      icon: <Play size={16} />,
      action: () => onPlayNext?.(track),
    },
    {
      id: 'add-queue',
      label: 'Add to Queue',
      icon: <ListPlus size={16} />,
      action: () => onAddToQueue?.(track),
    },
    {
      id: 'save-collection',
      label: 'Save to Collection',
      icon: <Heart size={16} />,
      action: () => onSaveToCollection?.(track),
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share2 size={16} />,
      action: () => onShare?.(track),
    },
    {
      id: 'view-artist',
      label: 'View Artist',
      icon: <User size={16} />,
      action: () => onViewArtist?.(track),
    },
  ];

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(0);
  }, []);

  const openMenu = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      // Temporary raw position
      let x = clientX;
      let y = clientY;

      // Initial boundary check estimate
      const estimatedWidth = 200;
      const estimatedHeight = 220;
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;

      if (x + estimatedWidth > winWidth - 10) {
        x = winWidth - estimatedWidth - 10;
      }
      if (y + estimatedHeight > winHeight - 10) {
        y = winHeight - estimatedHeight - 10;
      }

      setPosition({ x: Math.max(10, x), y: Math.max(10, y) });
      setFocusedIndex(0);
      setIsOpen(true);
    },
    [disabled]
  );

  // Desktop right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  };

  // Mobile long-press handling (500ms)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      openMenu(touch.clientX, touch.clientY);
      // Optional haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimerRef.current || !touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long press if scrolled/moved > 10px
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Adjust exact position after mounting menu based on actual bounds
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    setPosition((prev) => {
      let { x, y } = prev;
      if (x + rect.width > winWidth - 10) {
        x = winWidth - rect.width - 10;
      }
      if (y + rect.height > winHeight - 10) {
        y = winHeight - rect.height - 10;
      }
      return { x: Math.max(10, x), y: Math.max(10, y) };
    });

    // Focus the first item inside menu
    if (itemRefs.current[0]) {
      itemRefs.current[0]?.focus();
    }
  }, [isOpen]);

  // Focus trap and index sync
  useEffect(() => {
    if (isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Outside click & Escape & Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(menuItems.length - 1);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault(); // Focus trap: cycle inside menu
        if (e.shiftKey) {
          setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
        } else {
          setFocusedIndex((prev) => (prev + 1) % menuItems.length);
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu, menuItems.length]);

  const handleSelect = (item: (typeof menuItems)[number]) => {
    item.action();
    closeMenu();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onContextMenu={handleContextMenu}
      onTouchCancel={handleTouchEnd}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
    >
      {children}

      {isOpen && (
        <div
          ref={menuRef}
          aria-label={`Options for ${track.title}`}
          aria-orientation="vertical"
          className="w-52 py-1.5 rounded-xl bg-surface/95 backdrop-blur-md border border-border-dark shadow-2xl text-white outline-none focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          style={{
            position: 'fixed',
            top: `${position.y}px`,
            left: `${position.x}px`,
            zIndex: 9999,
          }}
        >
          <div className="px-3 py-1.5 mb-1 border-b border-border-dark/60 text-xs font-semibold text-on-muted truncate">
            {track.title}
          </div>

          {menuItems.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition-colors text-left focus:outline-none ${
                focusedIndex === index
                  ? 'bg-brand text-white font-semibold'
                  : 'text-gray-200 hover:bg-surface-hover hover:text-white'
              }`}
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <span className="shrink-0 text-current">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrackContextMenu;
