'use client';
import { ReactNode } from 'react';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SdkViewSectionType, SdkViewType } from '@dynamic-labs/sdk-api';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { http } from 'viem';
import { liskSepolia, mainnet, sepolia } from 'viem/chains';
import { createConfig, WagmiProvider } from 'wagmi';
import WrongNetworkBanner from '@/components/common/WrongNetworkBanner';
import { TransactionProvider } from '@/context/TransactionContext';
import { LoadingProvider } from '@/context/LoadingContext';
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { ThemeProvider } from "@/context/ThemeProvider";
import { WalletProvider } from '@/context/WalletContext';
import { queryClient } from '@/lib/queryClient';

const config = createConfig({
  chains: [mainnet, sepolia, liskSepolia],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(),
    [liskSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: 'c686da1e-ac86-4bd4-a2f4-5fe6ff42ed85',
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          views: [
            {
              type: SdkViewType.Login,
              sections: [
                {
                  type: SdkViewSectionType.Email,
                },
                {
                  type: SdkViewSectionType.Separator,
                  label: 'Or',
                },
                {
                  type: SdkViewSectionType.Social,
                  defaultItem: 'google',
                },
              ],
            },
          ],
        },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <WalletProvider>
              <TransactionProvider>
                <LoadingProvider>
                  <ThemeProvider><UserPreferencesProvider>
                    <WrongNetworkBanner />
                    {children}
                  </UserPreferencesProvider></ThemeProvider>
                </LoadingProvider>
              </TransactionProvider>
            </WalletProvider>
          </DynamicWagmiConnector>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
};

export default Provider;
