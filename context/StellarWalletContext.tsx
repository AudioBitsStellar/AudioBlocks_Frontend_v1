'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { StellarWalletsKit, NETWORK_PASSPHRASE, ISupportedWallet, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';
import { toast } from 'sonner';

type WalletNetwork = 'testnet' | 'public';

interface StellarWalletContextType {
  publicKey: string | null;
  walletId: string | null;
  network: WalletNetwork;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
}

const StellarWalletContext = createContext<StellarWalletContextType | undefined>(undefined);

const LAST_WALLET_KEY = 'stellarLastWalletId';

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const stellarNetwork = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet') as WalletNetwork;
  const network: WalletNetwork = stellarNetwork;

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
            if (error?.message?.includes('User declined')) {
              toast.error('Connection rejected');
            } else if (error?.message?.includes('not installed')) {
              toast.error(`${option.name} wallet is not installed`);
            } else {
              toast.error('Failed to connect wallet');
            }
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
    async (xdr: string, opts?: { networkPassphrase?: string }) => {
      if (!kit || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const networkPassphrase = opts?.networkPassphrase || 
        (network === 'public' ? Networks.PUBLIC : Networks.TESTNET);

      try {
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase,
        });
        return signedTxXdr;
      } catch (error: any) {
        if (error?.message?.includes('User declined')) {
          toast.error('Transaction rejected');
        } else {
          toast.error('Failed to sign transaction');
        }
        throw error;
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
