'use client';

import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, RotateCw } from 'lucide-react';
import { type ToastData } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
};

const iconColorMap = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = iconMap[toast.type];

  return (
    <motion.div
      layout
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-lg bg-surface-elevated border border-border-dark border-l-4 shadow-lg p-4',
        colorMap[toast.type]
      )}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Icon className={cn('shrink-0 mt-0.5', iconColorMap[toast.type])} size={18} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.message && <p className="text-xs text-on-muted mt-0.5">{toast.message}</p>}
        {toast.undoAction && (
          <button
            className="mt-1.5 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
            onClick={() => {
              toast.undoAction?.();
              onDismiss(toast.id);
            }}
          >
            {toast.undoLabel || 'Undo'}
          </button>
        )}
      </div>
      {toast.persistent && (
        <button
          aria-label="Dismiss"
          className="shrink-0 text-on-muted hover:text-white transition-colors"
          onClick={() => onDismiss(toast.id)}
        >
          <X size={14} />
        </button>
      )}
      {toast.loading && <RotateCw className="shrink-0 text-on-muted animate-spin" size={14} />}
    </motion.div>
  );
}
