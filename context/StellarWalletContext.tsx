'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { checkChainSafety, getTransactionReview, validateTransaction, type TransactionSummary as Summary } from '@/lib/chainSafety';
import { TransactionSummary } from '@/components/TransactionSummary';
import { Modal } from '@/components/ui/Modal';
import ChainSafetyBanner from '@/components/ChainSafetyBanner';
import { StellarWalletsKit, NETWORK_PASSPHRASE, ISupportedWallet, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';
import { toast } from 'sonner';
import { getWalletConnectionErrorMessage, getWalletSigningErrorMessage } from '@/lib/walletErrors';

type WalletNetwork = 'testnet' | 'public';

interface StellarWalletContextType {
  publicKey: string | null;
  walletId: string | null;
  network: WalletNetwork;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string; summary?: Summary }) => Promise<string>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

const LAST_WALLET_KEY = 'stellarLastWalletId';

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [review, setReview] = useState<Summary | null>(null);
  const signing = useRef(false);
  const resolveReview = useRef<((approved: boolean) => void) | null>(null);
  const finishReview = (approved: boolean) => {
    resolveReview.current?.(approved);
    resolveReview.current = null;
    setReview(null);
  };
  useEffect(() => () => { resolveReview.current?.(false); }, []);

  const stellarNetwork: WalletNetwork = ['public', 'mainnet'].includes(process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '') ? 'public' : 'testnet';
  const network: WalletNetwork = stellarNetwork;
  const currentAccount = useRef(publicKey);
  currentAccount.current = publicKey;
  useEffect(() => {
    resolveReview.current?.(false);
    resolveReview.current = null;
    setReview(null);
  }, [publicKey, network]);

  useEffect(() => {
    const walletsKit = new StellarWalletsKit({
      network: network === 'public' ? NETWORK_PASSPHRASE.PUBLIC : NETWORK_PASSPHRASE.TESTNET,
      selectedWalletId: walletId || undefined,
      modules: allowAllModules(),
    });
    setKit(walletsKit);
  }, [network, walletId]);

  useEffect(() => {
    const reconnect = async () => {
      const lastWallet = localStorage.getItem(LAST_WALLET_KEY);
      if (!lastWallet || !kit) return;

      try {
        setIsConnecting(true);
        kit.setWallet(lastWallet);
        const { address } = await kit.getAddress();
        setPublicKey(address);
        setWalletId(lastWallet);
      } catch (error) {
        localStorage.removeItem(LAST_WALLET_KEY);
      } finally {
        setIsConnecting(false);
      }
    };

    reconnect();
  }, [kit]);

  const connect = useCallback(async () => {
    if (!kit) {
      toast.error('Wallet kit not initialized');
      return;
    }

    try {
      setIsConnecting(true);
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            
            setPublicKey(address);
            setWalletId(option.id);
            localStorage.setItem(LAST_WALLET_KEY, option.id);
            
            toast.success(`Connected to ${option.name}`);
          } catch (error: any) {
            toast.error(getWalletConnectionErrorMessage(error));
            throw error;
          }
        },
      });
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [kit]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletId(null);
    localStorage.removeItem(LAST_WALLET_KEY);
    toast.info('Wallet disconnected');
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, opts?: { networkPassphrase?: string; summary?: Summary }) => {
      if (!kit || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const networkPassphrase = opts?.networkPassphrase || 
        (network === 'public' ? Networks.PUBLIC : Networks.TESTNET);
      if (networkPassphrase !== (network === 'public' ? Networks.PUBLIC : Networks.TESTNET)) {
        throw new Error('Wrong network. Switch your wallet to the network shown in AudioBlocks.');
      }

      if (signing.current) throw new Error('A transaction is already awaiting approval.');
      signing.current = true;
      try {
        const policy = await checkChainSafety();
        if (networkPassphrase !== policy.networkPassphrase) throw new Error('Network mismatch: signing blocked.');
        validateTransaction(xdr, policy, publicKey);
        const summary = await getTransactionReview(xdr, publicKey, policy);
        const approved = await new Promise<boolean>(resolve => {
          resolveReview.current = resolve;
          setReview(summary);
        });
        if (!approved) throw new Error('Transaction review cancelled.');
        // Policy can change while the user reviews the transaction.
        validateTransaction(xdr, await checkChainSafety(), publicKey);
        if (currentAccount.current !== publicKey) throw new Error('Wallet account changed. Review the transaction again.');
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase,
        });
        if (!signedTxXdr) throw new Error('No signed transaction returned by wallet.');
        return signedTxXdr;
      } catch (error: any) {
        toast.error(getWalletSigningErrorMessage(error));
        throw error;
      } finally {
        signing.current = false;
      }
    },
    [kit, publicKey, network]
  );

  return (
    <StellarWalletContext.Provider
      value={{
        publicKey,
        walletId,
        network,
        isConnecting,
        connect,
        disconnect,
        signTransaction,
      }}
    >
      {children}
      <ChainSafetyBanner />
      <Modal open={review !== null} title="Review transaction before signing" onClose={() => finishReview(false)}>
        {review && <TransactionSummary summary={review} />}
        <p className="my-3 text-sm">Check every detail. Confirmed transactions are irreversible.</p>
        <button type="button" onClick={() => finishReview(false)}>Cancel</button>
        <button className="ml-4" type="button" onClick={() => finishReview(true)}>Approve and open wallet</button>
      </Modal>
    </StellarWalletContext.Provider>
  );
}

export function useStellarWallet() {
  const context = useContext(StellarWalletContext);
  if (context === undefined) {
    throw new Error('useStellarWallet must be used within a StellarWalletProvider');
  }
  return context;
}

