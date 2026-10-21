"use client"
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ReactNode } from "react";
import { SdkViewSectionType, SdkViewType } from "@dynamic-labs/sdk-api";
import WrongNetworkBanner from "@/components/common/WrongNetworkBanner";
import { StellarWalletProvider } from "@/context/StellarWalletContext";

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
      <QueryClientProvider client={queryClient}>
        <StellarWalletProvider>
          <WrongNetworkBanner />
          {children}
        </StellarWalletProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}

export default Provider;