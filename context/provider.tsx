"use client"
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { http } from "viem";
import { liskSepolia, mainnet, sepolia } from "viem/chains";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ReactNode } from "react";
import { SdkViewSectionType, SdkViewType } from "@dynamic-labs/sdk-api";


const config = createConfig({
	chains: [mainnet, sepolia, liskSepolia],
	multiInjectedProviderDiscovery: false,
	transports: {
		[mainnet.id]: http(),
    [liskSepolia.id]: http(),
    [sepolia.id]: http()
	},
});

const queryClient = new QueryClient();

const  Provider=({ children }: { children: ReactNode })=> {
  return (
    <DynamicContextProvider
      settings={{
				environmentId: "c686da1e-ac86-4bd4-a2f4-5fe6ff42ed85",
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
              label: "Or",
            },
            {
              type: SdkViewSectionType.Social,
              defaultItem: "google",
            },
          ],
        },
      ]}
			}}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}

export default Provider;