import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { ACTIVE_STELLAR_NETWORK, STELLAR_BASE_RESERVE } from '@/lib/stellarConfig';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

/**
 * Horizon account response (#555).
 * Only the fields needed for balance calculation are typed.
 */
interface HorizonAccount {
  account_id: string;
  balances: Array<{
    asset_type: string;
    balance: string;
    buying_liabilities?: string;
    selling_liabilities?: string;
  }>;
  /** Number of ledger entries owned by this account (offers, trustlines, etc.). */
  subentry_count: number;
}

/**
 * Stellar balance state returned by the hook.
 */
export interface StellarBalance {
  /** Total XLM balance (stroops converted to XLM). */
  xlm: number;
  /** Spendable balance after subtracting reserve and selling liabilities. */
  spendableXlm: number;
  /** True if the account exists on the network. */
  isFunded: boolean;
}

const stellarBalanceKeys = {
  all: ['stellar-balance'] as const,
  account: (address: string) => ['stellar-balance', address] as const,
};

/**
 * Fetches an account from Horizon and computes its XLM balance.
 *
 * @param address - Stellar public key (G...).
 * @returns Balance data, or null if the account does not exist (404).
 * @throws Error on network failure or non-404 HTTP errors.
 */
async function fetchStellarBalance(address: string): Promise<StellarBalance | null> {
  const url = `${ACTIVE_STELLAR_NETWORK.horizonUrl}/accounts/${address}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  // Account not yet funded: Horizon returns 404.
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Horizon request failed: ${response.status} ${response.statusText}`);
  }

  const account: HorizonAccount = await response.json();

  // Find the native XLM balance (asset_type === 'native').
  const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
  if (!nativeBalance) {
    throw new Error('Account has no native XLM balance');
  }

  const xlm = parseFloat(nativeBalance.balance);
  const sellingLiabilities = parseFloat(nativeBalance.selling_liabilities ?? '0');

  // Minimum reserve: (2 + subentry_count) * 0.5 XLM.
  const minReserve = (2 + account.subentry_count) * STELLAR_BASE_RESERVE;

  // Spendable balance: total balance minus reserve minus selling liabilities.
  const spendableXlm = Math.max(0, xlm - minReserve - sellingLiabilities);

  return {
    xlm,
    spendableXlm,
    isFunded: true,
  };
}

/**
 * Fetches the connected Stellar wallet's XLM balance from Horizon (#555).
 *
 * Refetches on window focus and can be manually refetched after transactions.
 * Unfunded accounts (Horizon 404) return `isFunded: false`.
 *
 * @returns Query result with `{ xlm, spendableXlm, isFunded }` or undefined when
 *   no wallet is connected.
 *
 * @example
 * ```tsx
 * const { data: balance, isLoading, refetch } = useStellarBalance();
 *
 * if (isLoading) return <Loader />;
 * if (!balance) return <p>Connect your Stellar wallet</p>;
 * if (!balance.isFunded) return <UnfundedAccountWarning />;
 *
 * return <p>Spendable: {balance.spendableXlm.toFixed(2)} XLM</p>;
 * ```
 */
export function useStellarBalance() {
  // TODO (#555): Replace with actual Stellar wallet address when Stellar wallet
  // integration is added. For now, this uses the EVM address as a placeholder.
  // The hook will need to be updated to read from the Stellar wallet connector
  // (e.g., Freighter, Albedo, or a Dynamic-labs Stellar wallet) once available.
  const { address } = useAccount();

  // For now, we assume the Stellar address matches the EVM address format check.
  // In a real integration, validate that this is a Stellar public key (G...).
  const stellarAddress = address;

  return useQuery({
    queryKey: stellarBalanceKeys.account(stellarAddress ?? ''),
    queryFn: async (): Promise<StellarBalance> => {
      if (!stellarAddress) {
        throw new Error('No Stellar address available');
      }
      const balance = await fetchStellarBalance(stellarAddress);
      // Unfunded accounts return a special sentinel value.
      if (balance === null) {
        return { xlm: 0, spendableXlm: 0, isFunded: false };
      }
      return balance;
    },
    enabled: !!stellarAddress,
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
    // Refetch on window focus to catch balance changes from other tabs/wallets.
    refetchOnWindowFocus: true,
    // Keep showing the last known balance while a background refetch is in flight.
    placeholderData: (previousData) => previousData,
  });
}
