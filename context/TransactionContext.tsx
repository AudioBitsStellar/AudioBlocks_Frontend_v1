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
import { SorobanRpc } from '@stellar/stellar-sdk';
import { useToast } from './ToastContext';
import { getApiUrl } from '@/lib/apiUrl';

export type TransactionType = 'buy' | 'sell' | 'list' | 'cancel_listing' | 'bid' | 'transfer' | 'mint';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: number;
  amount?: string;
  counterparty?: string;
  item?: {
    id: string;
    title: string;
    cover?: string;
  };
  /** Final status from the submit response */
  finalStatus?: boolean;
}

interface TransactionContextValue {
  transactions: Transaction[];
  addTransaction: (hash: string, type: TransactionType, finalStatus?: boolean) => string;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  clearTransaction: (id: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

const STORAGE_KEY = 'pending_transactions';
const MAX_TRANSACTIONS = 20;
const AUTO_CLEAR_MS = 60_000;
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 10000;

// Use testnet RPC by default, can be overridden via env
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || (['public', 'mainnet'].includes(process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '') ? 'https://soroban-rpc.stellar.org' : 'https://soroban-testnet.stellar.org');

function generateId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadPersistedTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tx): tx is Transaction =>
      !!tx && typeof tx.id === 'string' && typeof tx.hash === 'string' &&
      tx.status === 'pending' && typeof tx.type === 'string' && typeof tx.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

function persistTransactions(transactions: Transaction[]) {
  if (typeof window === 'undefined') return;
  try {
    const pending = transactions.filter(tx => tx.status === 'pending');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage errors
  }
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollStartTimesRef = useRef<Map<string, number>>(new Map());
  const backoffRef = useRef<Map<string, number>>(new Map());

  // Load persisted transactions on mount
  useEffect(() => {
    const persisted = loadPersistedTransactions();
    setHydrated(true);
    if (persisted.length > 0) {
      setTransactions(persisted);
      // Resume polling for pending transactions
      persisted.forEach(tx => {
        if (tx.status === 'pending' && !tx.finalStatus) {
          pollStartTimesRef.current.set(tx.id, Date.now());
          pollTransaction(tx.id, tx.hash);
        }
      });
    }
  }, []);

  // Persist transactions when they change
  useEffect(() => {
    if (hydrated) persistTransactions(transactions);
  }, [transactions, hydrated]);

  const pollTransaction = useCallback(
    (id: string, hash: string) => {
      if (pollingRef.current.has(id)) return;
      const server = new SorobanRpc.Server(RPC_URL);
      const startTime = pollStartTimesRef.current.get(id) || Date.now();
      pollStartTimesRef.current.set(id, startTime);

      const currentBackoff = backoffRef.current.get(id) || INITIAL_BACKOFF_MS;

      let inFlight = false;
      let nextPollAt = 0;
      const interval = setInterval(async () => {
        if (inFlight || Date.now() < nextPollAt) return;
        inFlight = true;
        try {
          // Prefer indexer truth after reload, including transactions outside RPC retention.
          let response: { status: string };
          try {
            const indexed = await fetch(getApiUrl(`transactions/${encodeURIComponent(hash)}/status`), {
              credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(10000),
            });
            if (!indexed.ok) throw new Error('Indexer unavailable');
            const data = await indexed.json();
            if (!['confirmed', 'failed', 'pending'].includes(data.status)) throw new Error('Unknown indexer status');
            response = { status: data.status === 'confirmed' ? 'SUCCESS' : data.status === 'failed' ? 'FAILED' : 'NOT_FOUND' };
          } catch {
            response = await server.getTransaction(hash);
          }

          if (!pollingRef.current.has(id)) return;
          if (response.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
            clearInterval(interval);
            pollingRef.current.delete(id);
            pollStartTimesRef.current.delete(id);
            backoffRef.current.delete(id);

            setTransactions((prev) => 
              prev.map((tx) => 
                tx.id === id ? { ...tx, status: 'confirmed' } : tx
              )
            );

            toast({
              type: 'success',
              title: 'Transaction confirmed',
              message: `Transaction ${hash.slice(0, 10)}... confirmed`,
            });

            setTimeout(() => {
              setTransactions((prev) => prev.filter((tx) => tx.id !== id));
            }, AUTO_CLEAR_MS);
          } else if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
            clearInterval(interval);
            pollingRef.current.delete(id);
            pollStartTimesRef.current.delete(id);
            backoffRef.current.delete(id);

            setTransactions((prev) => 
              prev.map((tx) => 
                tx.id === id ? { ...tx, status: 'failed' } : tx
              )
            );

            toast({
              type: 'error',
              title: 'Transaction failed',
              message: `Transaction ${hash.slice(0, 10)}... failed`,
            });
          } else if (response.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
            // Transaction not yet on the network, apply backoff
            const newBackoff = Math.min(currentBackoff * 1.5, MAX_BACKOFF_MS);
            backoffRef.current.set(id, newBackoff);
          }
        } catch (error) {
          // Network error, apply backoff
          const newBackoff = Math.min(currentBackoff * 1.5, MAX_BACKOFF_MS);
          backoffRef.current.set(id, newBackoff);
        }
        finally {
          inFlight = false;
          nextPollAt = Date.now() + (backoffRef.current.get(id) ?? currentBackoff);
        }
      }, currentBackoff);

      pollingRef.current.set(id, interval);
    },
    [toast]
  );

  const addTransaction = useCallback(
    (hash: string, type: TransactionType, finalStatus?: boolean): string => {
      const id = generateId();
      const newTransaction: Transaction = {
        id,
        hash,
        type,
        status: finalStatus ? 'confirmed' : 'pending',
        timestamp: Date.now(),
        finalStatus,
      };

      setTransactions((prev) => {
        const updated = [newTransaction, ...prev.filter(tx => tx.hash !== hash)].slice(0, MAX_TRANSACTIONS);
        return updated;
      });

      if (!finalStatus) {
        toast({
          type: 'info',
          title: 'Transaction pending',
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction submitted`,
        });

        pollTransaction(id, hash);
      } else {
        toast({
          type: 'success',
          title: 'Transaction confirmed',
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction confirmed`,
        });

        setTimeout(() => {
          setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        }, AUTO_CLEAR_MS);
      }

      return id;
    },
    [toast, pollTransaction]
  );

  const updateTransactionStatus = useCallback((id: string, status: TransactionStatus) => {
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, status } : tx)));
  }, []);

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
    const pollers = pollingRef.current;
    return () => {
      pollers.forEach((interval) => clearInterval(interval));
      pollers.clear();
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


