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
import SessionExpiryModal from '@/components/common/SessionExpiryModal';
import WrongNetworkBanner from '@/components/common/WrongNetworkBanner';
import { LoadingProvider } from '@/context/LoadingContext';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import { ToastProvider } from '@/context/ToastContext';
import { TransactionProvider } from '@/context/TransactionContext';
import { UserPreferencesProvider } from '@/context/UserPreferencesContext';
import { WalletProvider } from '@/context/WalletContext';
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import { useWalletConnectionErrors } from '@/hooks/useWalletConnectionErrors';
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

/**
 * Watches wallet connect/disconnect transitions and reports them to the
 * analytics layer (#323). Rendered inside the wagmi/Dynamic providers so it
 * can read account state.
 */
function WalletAnalyticsTracker() {
  useWalletAnalytics();
  return null;
}

/** Keeps provider connection failures user-facing without duplicating listeners in each CTA. */
function WalletConnectionErrorHandler() {
  useWalletConnectionErrors();
  return null;
}

const Provider = ({ children }: { children: ReactNode }) => {
  return (
    <ToastProvider>
      <PlaybackProvider>
        <DynamicContextProvider
          settings={{
            environmentId: 'c686da1e-ac86-4bd4-a2f4-5fe6ff42ed85',
            walletConnectors: [EthereumWalletConnectors],
            theme: 'auto',
            cssOverrides: `
              .dynamic-shadow-dom {
                width: 100% !important;
                max-width: 400px;
                margin: 0 auto;
              }
              /* Accessibility focus indicators */
              button:focus-visible, input:focus-visible {
                outline: 2px solid #D2045B !important;
                outline-offset: 2px !important;
              }
            `,
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
          <WalletConnectionErrorHandler />
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <DynamicWagmiConnector>
                <WalletAnalyticsTracker />
                <WalletProvider>
                  <TransactionProvider>
                    <LoadingProvider>
                      <ThemeProvider>
                        <UserPreferencesProvider>
                          <WrongNetworkBanner />
                          <SessionExpiryModal />
                          {children}
                        </UserPreferencesProvider>
                      </ThemeProvider>
                    </LoadingProvider>
                  </TransactionProvider>
                </WalletProvider>
              </DynamicWagmiConnector>
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </QueryClientProvider>
          </WagmiProvider>
        </DynamicContextProvider>
      </PlaybackProvider>
    </ToastProvider>
  );
};

export default Provider;
