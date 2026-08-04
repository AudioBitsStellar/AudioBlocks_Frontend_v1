'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useToast } from './ToastContext';

export type TransactionType = 'buy' | 'stake' | 'vote';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: number;
}

interface TransactionContextValue {
  transactions: Transaction[];
  addTransaction: (hash: string, type: TransactionType) => string;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  clearTransaction: (id: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

const MAX_TRANSACTIONS = 20;
const POLL_INTERVAL_MS = 2000;
const AUTO_CLEAR_MS = 60_000;

function generateId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const pollTransaction = useCallback(
    (id: string, hash: string) => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/transactions/${hash}/status`,
            {
              method: 'GET',
              headers: { Accept: 'application/json' },
            }
          );

          if (!response.ok) return;

          const data = (await response.json()) as {
            status?: string;
            confirmed?: boolean;
          };

          const status: TransactionStatus =
            data.confirmed === true
              ? 'confirmed'
              : data.status === 'failed'
                ? 'failed'
                : 'pending';

          setTransactions((prev) =>
            prev.map((tx) => (tx.id === id ? { ...tx, status } : tx))
          );

          if (status === 'confirmed') {
            toast({
              type: 'success',
              title: 'Transaction confirmed',
              message: `Transaction ${hash.slice(0, 10)}... confirmed`,
            });
            clearInterval(interval);
            pollingRef.current.delete(id);

            setTimeout(() => {
              setTransactions((prev) => prev.filter((tx) => tx.id !== id));
            }, AUTO_CLEAR_MS);
          } else if (status === 'failed') {
            toast({
              type: 'error',
              title: 'Transaction failed',
              message: `Transaction ${hash.slice(0, 10)}... failed`,
            });
            clearInterval(interval);
            pollingRef.current.delete(id);
          }
        } catch {
          // Silently ignore polling errors
        }
      }, POLL_INTERVAL_MS);

      pollingRef.current.set(id, interval);
    },
    [toast]
  );

  const addTransaction = useCallback(
    (hash: string, type: TransactionType): string => {
      const id = generateId();
      const newTransaction: Transaction = {
        id,
        hash,
        type,
        status: 'pending',
        timestamp: Date.now(),
      };

      setTransactions((prev) => {
        const updated = [newTransaction, ...prev].slice(0, MAX_TRANSACTIONS);
        return updated;
      });

      toast({
        type: 'info',
        title: 'Transaction pending',
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction submitted`,
        loading: true,
      });

      pollTransaction(id, hash);

      return id;
    },
    [toast, pollTransaction]
  );

  const updateTransactionStatus = useCallback(
    (id: string, status: TransactionStatus) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, status } : tx))
      );
    },
    []
  );

  const clearTransaction = useCallback((id: string) => {
    const interval = pollingRef.current.get(id);
    if (interval) {
      clearInterval(interval);
      pollingRef.current.delete(id);
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const clearAllTransactions = useCallback(() => {
    pollingRef.current.forEach((interval) => clearInterval(interval));
    pollingRef.current.clear();
    setTransactions([]);
  }, []);

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((interval) => clearInterval(interval));
      pollingRef.current.clear();
    };
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransactionStatus,
        clearTransaction,
        clearAllTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction(): TransactionContextValue {
  const ctx = useContext(TransactionContext);
  if (!ctx) {
    throw new Error('useTransaction must be used inside TransactionProvider');
  }
  return ctx;
}