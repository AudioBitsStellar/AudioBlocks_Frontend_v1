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

/**
 * Types of toast notifications that can be displayed.
 * @typedef {'success' | 'error' | 'info'} ToastType
 */
type ToastType = 'success' | 'error' | 'info';

/**
 * Data structure representing a toast notification.
 * @interface ToastData
 */
export interface ToastData {
  /** Unique identifier for the toast */
  id: string;
  /** Type of toast notification */
  type: ToastType;
  /** Main title/message of the toast */
  title: string;
  /** Optional detailed message */
  message?: string;
  /** Whether the toast should persist until manually dismissed */
  persistent?: boolean;
  /** Whether the toast shows a loading indicator */
  loading?: boolean;
  /** Optional undo action callback */
  undoAction?: () => void;
  /** Label for the undo action button */
  undoLabel?: string;
}

/**
 * Options for creating a new toast notification.
 * @interface ToastOptions
 */
interface ToastOptions {
  /** Type of toast notification */
  type: ToastType;
  /** Main title/message of the toast */
  title: string;
  /** Optional detailed message */
  message?: string;
  /** Duration in milliseconds before auto-dismissal (0 for persistent) */
  duration?: number;
  /** Optional undo action callback */
  undoAction?: () => void;
  /** Label for the undo action button */
  undoLabel?: string;
}

/**
 * Toast context value interface providing toast notification management.
 * @interface ToastContextValue
 */
interface ToastContextValue {
  /** 
   * Display a custom toast notification with the provided options.
   * @param {ToastOptions} options - Toast configuration options
   * @returns {string} Unique identifier of the created toast
   */
  toast: (options: ToastOptions) => string;
  
  /** 
   * Dismiss a specific toast notification by its ID.
   * @param {string} id - Unique identifier of the toast to dismiss
   * @returns {void}
   */
  dismiss: (id: string) => void;
  
  /** 
   * Display a success toast notification.
   * @param {string} title - Main title/message of the toast
   * @param {string} [message] - Optional detailed message
   * @returns {string} Unique identifier of the created toast
   */
  success: (title: string, message?: string) => string;
  
  /** 
   * Display an error toast notification.
   * @param {string} title - Main title/message of the toast
   * @param {string} [message] - Optional detailed message
   * @returns {string} Unique identifier of the created toast
   */
  error: (title: string, message?: string) => string;
  
  /** 
   * Display an informational toast notification.
   * @param {string} title - Main title/message of the toast
   * @param {string} [message] - Optional detailed message
   * @returns {string} Unique identifier of the created toast
   */
  info: (title: string, message?: string) => string;
}

/** Maximum number of visible toast notifications at once */
const MAX_VISIBLE = 3;

/**
 * Toast context instance for managing toast notifications across the application.
 * @type {React.Context<ToastContextValue | null>}
 */
const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

/**
 * Generates a unique ID for toast notifications.
 * @returns {string} Unique toast identifier
 */
function generateId(): string {
  toastCounter += 1;
  return `toast-${toastCounter}-${Date.now()}`;
}

/**
 * ToastProvider component that wraps the application to provide toast notification management.
 * This provider manages toast notifications with support for success, error, and info types,
 * with auto-dismissal and undo functionality.
 * @component
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to be wrapped with toast context
 * @returns {JSX.Element} Toast context provider
 */
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
