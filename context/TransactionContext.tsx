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
import { SorobanRpc, Networks } from '@stellar/stellar-sdk';
import { useToast } from './ToastContext';

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
  addTransaction: (hash: string, type: TransactionType) => string;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  clearTransaction: (id: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

const STORAGE_KEY = 'pending_transactions';
const MAX_TRANSACTIONS = 20;
const POLL_INTERVAL_MS = 3000;
const AUTO_CLEAR_MS = 60_000;
const MAX_POLL_DURATION_MS = 120_000; // 2 minutes
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 10000;

// Use testnet RPC by default, can be overridden via env
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

function generateId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadPersistedTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollStartTimesRef = useRef<Map<string, number>>(new Map());
  const backoffRef = useRef<Map<string, number>>(new Map());

  // Load persisted transactions on mount
  useEffect(() => {
    const persisted = loadPersistedTransactions();
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
    persistTransactions(transactions);
  }, [transactions]);

  const pollTransaction = useCallback(
    (id: string, hash: string) => {
      const server = new SorobanRpc.Server(RPC_URL);
      const startTime = pollStartTimesRef.current.get(id) || Date.now();
      pollStartTimesRef.current.set(id, startTime);

      const currentBackoff = backoffRef.current.get(id) || INITIAL_BACKOFF_MS;

      const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        
        // Stop polling after max duration
        if (elapsed > MAX_POLL_DURATION_MS) {
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
            title: 'Transaction timeout',
            message: `Transaction ${hash.slice(0, 10)}... timed out`,
          });
          return;
        }

        try {
          const response = await server.getTransaction(hash);

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
        const updated = [newTransaction, ...prev].slice(0, MAX_TRANSACTIONS);
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
