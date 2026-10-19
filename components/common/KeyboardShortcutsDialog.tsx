'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open = false, onOpenChange }: KeyboardShortcutsDialogProps) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '?') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const shortcuts = [
    { key: 'Space', description: 'Play / Pause' },
    { key: '→', description: 'Next track' },
    { key: '←', description: 'Previous track' },
    { key: 'M', description: 'Mute / Unmute' },
    { key: '+', description: 'Increase volume' },
    { key: '−', description: 'Decrease volume' },
    { key: 'Q', description: 'Open queue' },
    { key: 'S', description: 'Toggle shuffle' },
    { key: 'R', description: 'Toggle repeat' },
    { key: 'Ctrl+?', description: 'Show this help' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161616] text-white rounded-lg max-w-md w-full border border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs bg-white/10 text-white rounded border border-white/20 font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 text-xs text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded inline">Ctrl+?</kbd> anytime to toggle this dialog
        </div>
      </div>
    </div>
  );
}
