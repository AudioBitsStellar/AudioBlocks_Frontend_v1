'use client';
import { useState } from 'react';
import WalletHelpLink from '@/components/help/WalletHelpLink';
import {
  canFundWithFriendbot,
  fundTestnetAccount,
  STELLAR_TESTNET_PASSPHRASE,
} from '@/lib/walletHelp';
type WalletState = { address: string; networkPassphrase: string; funded: boolean };
export default function TestnetFunding() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const readWallet = async () => {
    const freighter = await import('@stellar/freighter-api');
    const connection = await freighter.isConnected();
    if (!connection.isConnected)
      throw new Error('No Freighter wallet found. Install Freighter, then return to this guide.');
    const access = await freighter.requestAccess();
    if (access.error || !access.address)
      throw new Error('Wallet connection was not approved. Unlock Freighter and try again.');
    const network = await freighter.getNetworkDetails();
    if (network.error || !network.networkPassphrase)
      throw new Error('Unable to read your wallet network. Check Freighter and reconnect.');
    return { address: access.address, networkPassphrase: network.networkPassphrase };
  };
  const connect = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    setWallet(null);
    try {
      const connected = await readWallet();
      const horizon =
        connected.networkPassphrase === STELLAR_TESTNET_PASSPHRASE
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org';
      let funded = true;
      if (
        connected.networkPassphrase === STELLAR_TESTNET_PASSPHRASE ||
        connected.networkPassphrase === 'Public Global Stellar Network ; September 2015'
      ) {
        const response = await fetch(
          `${horizon}/accounts/${encodeURIComponent(connected.address)}`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (response.status === 404) funded = false;
        else if (!response.ok)
          throw new Error('Unable to check this account balance. Please try again.');
      }
      setWallet({ ...connected, funded });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const fund = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      // Recheck the actual wallet: it may have changed account/network since connection.
      const current = await readWallet();
      if (
        current.address !== wallet?.address ||
        current.networkPassphrase !== wallet.networkPassphrase
      ) {
        setWallet(null);
        throw new Error('Your wallet account or network changed. Connect again before funding.');
      }
      await fundTestnetAccount(current.address, current.networkPassphrase);
      setWallet({ ...current, funded: true });
      setMessage(
        'Test XLM requested successfully. Check your Freighter balance. Test XLM has no monetary value.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Funding failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-xl border border-border-dark p-4">
      <button
        className="rounded-full border border-border-dark px-4 py-2 disabled:opacity-50"
        disabled={busy}
        type="button"
        onClick={() => void connect()}
      >
        {busy ? 'Please wait…' : 'Connect Freighter / refresh account'}
      </button>
      {wallet && (
        <>
          <p className="break-all text-sm">Connected account: {wallet.address}</p>
          <p>
            Network:{' '}
            {wallet.networkPassphrase === STELLAR_TESTNET_PASSPHRASE
              ? 'Testnet'
              : 'Mainnet or custom network'}
          </p>
          {!wallet.funded && (
            <div>
              <p>This account has not been funded on this network yet.</p>
              <WalletHelpLink />
            </div>
          )}
          {canFundWithFriendbot(wallet.address, wallet.networkPassphrase) ? (
            <button
              className="rounded-full bg-brand px-4 py-2 text-white disabled:opacity-50"
              disabled={busy}
              type="button"
              onClick={() => void fund()}
            >
              Get test XLM with Friendbot
            </button>
          ) : (
            <p>
              Friendbot is available only on Stellar Testnet. For testing, switch networks in
              Freighter and reconnect.
            </p>
          )}
        </>
      )}
      <p aria-live="polite" role="status">
        {message}
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <WalletHelpLink />
        </div>
      )}
    </div>
  );
}
