'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-[90vw] max-h-[90vh] w-full',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdropClick?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const content = contentRef.current;
        if (!content) return;

        const focusable = content.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open && contentRef.current) {
      const focusable = contentRef.current.querySelector<HTMLElement>(FOCUSABLE);
      if (focusable) {
        focusable.focus();
      } else {
        contentRef.current.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnBackdropClick ? onClose : undefined}
          />
          <motion.div
            ref={contentRef}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-describedby={description ? 'modal-description' : undefined}
            aria-label={title}
            aria-modal="true"
            className={cn(
              'relative z-10 w-full rounded-xl bg-surface border border-border-dark shadow-2xl p-6 outline-none',
              sizeStyles[size],
              className
            )}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            role="dialog"
            tabIndex={-1}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              className="absolute top-4 right-4 text-on-muted hover:text-white transition-colors"
              onClick={onClose}
            >
              <X size={18} />
            </button>
            {title && <h2 className="text-lg font-semibold text-white pr-8">{title}</h2>}
            {description && (
              <p className="text-sm text-on-muted mt-1" id="modal-description">
                {description}
              </p>
            )}
            <div className={cn(title || description ? 'mt-4' : '')}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
