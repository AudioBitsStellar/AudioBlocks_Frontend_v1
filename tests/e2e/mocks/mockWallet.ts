import type { Page } from '@playwright/test';

/** Account the mock wallet exposes to the app. */
export const MOCK_WALLET_ADDRESS = '0x742d35Cc6634c0532925A3b844Bc9e7595f2BD38';

/** Hash returned for every submitted transaction. */
export const MOCK_TX_HASH = `0x${'ab'.repeat(32)}`;

export interface MockWalletOptions {
  /** When true, every transaction request is rejected as if the user declined it. */
  rejectTransactions?: boolean;
}

export interface MockWalletHandle {
  /** Transaction requests the app has sent to the wallet, in order. */
  sentTransactions(): Promise<unknown[]>;
}

/**
 * Injects a fake EIP-1193 wallet (`window.ethereum`) before any page script
 * runs, so the app's wagmi connector sees a connected account without a real
 * wallet extension. Reusable by any E2E spec that needs a signed-in wallet.
 *
 * Signing is simulated: `eth_sendTransaction` returns a fixed hash and the
 * receipt is reported as successful on the next poll.
 */
export async function installMockWallet(
  page: Page,
  { rejectTransactions = false }: MockWalletOptions = {}
): Promise<MockWalletHandle> {
  await page.addInitScript(
    ({ address, txHash, reject }) => {
      const sent: unknown[] = [];
      (window as unknown as { __sentTransactions: unknown[] }).__sentTransactions = sent;

      const provider = {
        isMetaMask: true,
        async request({ method, params }: { method: string; params?: unknown[] }) {
          switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              return [address];
            case 'eth_chainId':
              return '0x1';
            case 'net_version':
              return '1';
            case 'eth_getTransactionReceipt':
              return { transactionHash: txHash, status: '0x1', blockNumber: '0x1' };
            case 'eth_estimateGas':
              return '0x5208';
            case 'eth_sendTransaction':
              if (reject) {
                throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
              }
              sent.push(params?.[0]);
              return txHash;
            default:
              return null;
          }
        },
        on() {},
        removeListener() {},
      };

      Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
    },
    { address: MOCK_WALLET_ADDRESS, txHash: MOCK_TX_HASH, reject: rejectTransactions }
  );

  return {
    sentTransactions: () =>
      page.evaluate(
        () => (window as unknown as { __sentTransactions?: unknown[] }).__sentTransactions ?? []
      ),
  };
}
