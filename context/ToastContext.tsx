'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from '@/components/ui/Toast';

type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  persistent?: boolean;
  loading?: boolean;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const MAX_VISIBLE = 3;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

function generateId(): string {
  toastCounter += 1;
  return `toast-${toastCounter}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId();
      const persistent =
        options.type === 'error'
          ? true
          : options.duration === undefined
            ? false
            : options.duration <= 0;

      const newToast: ToastData = {
        id,
        type: options.type,
        title: options.title,
        message: options.message,
        persistent,
        undoAction: options.undoAction,
        undoLabel: options.undoLabel,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated.length > MAX_VISIBLE ? updated.slice(updated.length - MAX_VISIBLE) : updated;
      });

      if (!persistent) {
        const duration = options.duration ?? 3000;
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, message?: string) => toast({ type: 'success', title, message }),
    [toast]
  );

  const error = useCallback(
    (title: string, message?: string) => toast({ type: 'error', title, message }),
    [toast]
  );

  const info = useCallback(
    (title: string, message?: string) => toast({ type: 'info', title, message }),
    [toast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-sm:top-2 max-sm:right-2 max-sm:left-2 max-sm:items-center"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
